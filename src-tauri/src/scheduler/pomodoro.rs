//! Pomodoro state machine. Pure logic, no I/O, driven by wall-clock time so it
//! survives system sleep and timer drift.

use chrono::{DateTime, Duration, Utc};
use serde::Serialize;

use crate::config::AppConfig;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Idle,
    Work,
    ShortBreak,
    LongBreak,
}

impl Phase {
    pub fn as_str(self) -> &'static str {
        match self {
            Phase::Idle => "idle",
            Phase::Work => "work",
            Phase::ShortBreak => "short_break",
            Phase::LongBreak => "long_break",
        }
    }

    pub fn is_break(self) -> bool {
        matches!(self, Phase::ShortBreak | Phase::LongBreak)
    }

    fn length(self, cfg: &AppConfig) -> Duration {
        let mins = match self {
            Phase::Idle => 0,
            Phase::Work => cfg.pomodoro_work_min,
            Phase::ShortBreak => cfg.pomodoro_short_break_min,
            Phase::LongBreak => cfg.pomodoro_long_break_min,
        };
        Duration::minutes(mins as i64)
    }
}

/// What happened during a tick or command, so the caller can log and notify.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Transition {
    /// A phase finished naturally or was skipped.
    Completed {
        finished: Phase,
        /// `true` when the phase ran to its end, `false` when skipped.
        natural: bool,
        /// Phase the machine moved into (may be `Idle` when auto-start is off).
        next: Phase,
    },
    Started(Phase),
    Stopped {
        was: Phase,
    },
}

#[derive(Debug, Clone)]
pub struct Pomodoro {
    pub phase: Phase,
    /// When the current phase ends (only while running and not paused).
    deadline: Option<DateTime<Utc>>,
    /// Time left while paused.
    paused_remaining: Option<Duration>,
    /// Full length of the current phase.
    total: Duration,
    /// Work sessions completed in the current cycle.
    pub session: u32,
    /// Phase queued to start when the user presses start after a non-auto transition.
    pub queued: Phase,
}

impl Default for Pomodoro {
    fn default() -> Self {
        Self {
            phase: Phase::Idle,
            deadline: None,
            paused_remaining: None,
            total: Duration::zero(),
            session: 0,
            queued: Phase::Work,
        }
    }
}

impl Pomodoro {
    pub fn is_running(&self) -> bool {
        self.phase != Phase::Idle
    }

    pub fn is_paused(&self) -> bool {
        self.phase != Phase::Idle && self.paused_remaining.is_some()
    }

    pub fn total_secs(&self) -> u64 {
        self.total.num_seconds().max(0) as u64
    }

    pub fn remaining_secs(&self, now: DateTime<Utc>) -> u64 {
        if let Some(r) = self.paused_remaining {
            return r.num_seconds().max(0) as u64;
        }
        match self.deadline {
            Some(d) => (d - now).num_seconds().max(0) as u64,
            None => 0,
        }
    }

    fn begin(&mut self, phase: Phase, now: DateTime<Utc>, cfg: &AppConfig) {
        self.phase = phase;
        self.total = phase.length(cfg);
        self.deadline = Some(now + self.total);
        self.paused_remaining = None;
    }

    /// Start: from idle begins the queued phase (work by default); while
    /// paused it resumes; while running it is a no-op.
    pub fn start(&mut self, now: DateTime<Utc>, cfg: &AppConfig) -> Option<Transition> {
        match self.phase {
            Phase::Idle => {
                let phase = if self.queued == Phase::Idle {
                    Phase::Work
                } else {
                    self.queued
                };
                self.begin(phase, now, cfg);
                Some(Transition::Started(phase))
            }
            _ if self.is_paused() => {
                self.resume(now);
                None
            }
            _ => None,
        }
    }

    pub fn pause(&mut self, now: DateTime<Utc>) {
        if self.phase == Phase::Idle || self.paused_remaining.is_some() {
            return;
        }
        let remaining = self
            .deadline
            .map(|d| d - now)
            .unwrap_or_else(Duration::zero)
            .max(Duration::zero());
        self.paused_remaining = Some(remaining);
        self.deadline = None;
    }

    pub fn resume(&mut self, now: DateTime<Utc>) {
        if let Some(r) = self.paused_remaining.take() {
            self.deadline = Some(now + r);
        }
    }

    /// Toggle between running and paused; starts if idle.
    pub fn toggle(&mut self, now: DateTime<Utc>, cfg: &AppConfig) -> Option<Transition> {
        match self.phase {
            Phase::Idle => self.start(now, cfg),
            _ if self.is_paused() => {
                self.resume(now);
                None
            }
            _ => {
                self.pause(now);
                None
            }
        }
    }

    pub fn stop(&mut self) -> Option<Transition> {
        if self.phase == Phase::Idle {
            return None;
        }
        let was = self.phase;
        *self = Pomodoro::default();
        Some(Transition::Stopped { was })
    }

    /// Finish the current phase immediately.
    pub fn skip(&mut self, now: DateTime<Utc>, cfg: &AppConfig) -> Option<Transition> {
        if self.phase == Phase::Idle {
            return None;
        }
        Some(self.complete(now, cfg, false))
    }

    /// Advance the clock. Returns a transition when the phase ended.
    pub fn tick(&mut self, now: DateTime<Utc>, cfg: &AppConfig) -> Option<Transition> {
        if self.phase == Phase::Idle || self.paused_remaining.is_some() {
            return None;
        }
        match self.deadline {
            Some(d) if now >= d => Some(self.complete(now, cfg, true)),
            _ => None,
        }
    }

    fn complete(&mut self, now: DateTime<Utc>, cfg: &AppConfig, natural: bool) -> Transition {
        let finished = self.phase;
        let (next, auto) = match finished {
            Phase::Work => {
                self.session += 1;
                if self.session >= cfg.pomodoro_sessions_before_long {
                    self.session = 0;
                    (Phase::LongBreak, cfg.pomodoro_auto_start_break)
                } else {
                    (Phase::ShortBreak, cfg.pomodoro_auto_start_break)
                }
            }
            Phase::ShortBreak | Phase::LongBreak => (Phase::Work, cfg.pomodoro_auto_start_work),
            Phase::Idle => (Phase::Work, false),
        };

        if auto {
            self.begin(next, now, cfg);
            self.queued = Phase::Work;
            Transition::Completed {
                finished,
                natural,
                next,
            }
        } else {
            self.phase = Phase::Idle;
            self.deadline = None;
            self.paused_remaining = None;
            self.total = Duration::zero();
            self.queued = next;
            Transition::Completed {
                finished,
                natural,
                next: Phase::Idle,
            }
        }
    }

    /// Re-read durations after a config change. Only the *next* phase is
    /// affected; a running phase keeps its deadline.
    pub fn apply_config(&mut self, _cfg: &AppConfig) {}
}

#[cfg(test)]
#[allow(clippy::field_reassign_with_default)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn t0() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 3, 11, 9, 0, 0).unwrap()
    }

    fn cfg() -> AppConfig {
        let mut c = AppConfig::default();
        c.pomodoro_work_min = 25;
        c.pomodoro_short_break_min = 5;
        c.pomodoro_long_break_min = 15;
        c.pomodoro_sessions_before_long = 2;
        c.pomodoro_auto_start_break = true;
        c.pomodoro_auto_start_work = false;
        c
    }

    #[test]
    fn full_cycle() {
        let c = cfg();
        let mut p = Pomodoro::default();
        assert_eq!(p.start(t0(), &c), Some(Transition::Started(Phase::Work)));
        assert_eq!(p.remaining_secs(t0()), 25 * 60);
        assert!(p.tick(t0() + Duration::minutes(24), &c).is_none());

        let tr = p.tick(t0() + Duration::minutes(25), &c).unwrap();
        assert_eq!(
            tr,
            Transition::Completed {
                finished: Phase::Work,
                natural: true,
                next: Phase::ShortBreak
            }
        );
        assert_eq!(p.phase, Phase::ShortBreak);
        assert_eq!(p.session, 1);

        // Break finishes; auto-start work is off => idle with work queued.
        let t = t0() + Duration::minutes(30);
        let tr = p.tick(t, &c).unwrap();
        assert_eq!(
            tr,
            Transition::Completed {
                finished: Phase::ShortBreak,
                natural: true,
                next: Phase::Idle
            }
        );
        assert_eq!(p.phase, Phase::Idle);
        assert_eq!(p.queued, Phase::Work);

        // Second work session => long break.
        p.start(t, &c);
        let tr = p.tick(t + Duration::minutes(25), &c).unwrap();
        assert!(matches!(
            tr,
            Transition::Completed {
                next: Phase::LongBreak,
                ..
            }
        ));
        assert_eq!(p.session, 0, "cycle resets after long break starts");
    }

    #[test]
    fn pause_and_resume_keep_remaining() {
        let c = cfg();
        let mut p = Pomodoro::default();
        p.start(t0(), &c);
        // Simulate 10 minutes of running then pause.
        p.deadline = Some(t0() + Duration::minutes(15));
        p.pause(t0());
        assert!(p.is_paused());
        let r = p.remaining_secs(t0());
        assert!(r <= 15 * 60);
        p.resume(t0() + Duration::hours(3));
        assert!(!p.is_paused());
        assert!(p.remaining_secs(t0() + Duration::hours(3)) <= 15 * 60);
        assert!(p.remaining_secs(t0() + Duration::hours(3)) > 14 * 60);
    }

    #[test]
    fn skip_is_not_natural() {
        let c = cfg();
        let mut p = Pomodoro::default();
        p.start(t0(), &c);
        let tr = p.skip(t0() + Duration::minutes(1), &c).unwrap();
        assert!(matches!(tr, Transition::Completed { natural: false, .. }));
    }

    #[test]
    fn stop_resets_everything() {
        let c = cfg();
        let mut p = Pomodoro::default();
        p.start(t0(), &c);
        p.session = 1;
        assert_eq!(p.stop(), Some(Transition::Stopped { was: Phase::Work }));
        assert_eq!(p.phase, Phase::Idle);
        assert_eq!(p.session, 0);
        assert!(p.stop().is_none());
    }
}
