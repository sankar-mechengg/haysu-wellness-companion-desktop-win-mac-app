//! Background scheduler: water and movement countdowns, Pomodoro, DND,
//! schedule and idle handling. One tokio task ticks every second, holds the
//! state lock briefly, and emits a single `timer-tick` snapshot.

pub mod idle;
pub mod pomodoro;
pub mod schedule;

use std::sync::{Arc, Mutex};
use std::time::Instant;

use chrono::{DateTime, Duration, Local, Utc};
use rand::seq::SliceRandom;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::config::{AppConfig, ConfigState, ReminderStyle};
use crate::db::{time, DbState};
use pomodoro::{Phase, Pomodoro, Transition};

// ─── Events ────────────────────────────────────────────────────────────────

pub const EV_TICK: &str = "timer-tick";
pub const EV_REMINDER: &str = "reminder";
pub const EV_POMODORO: &str = "pomodoro-phase";

#[derive(Debug, Clone, Serialize)]
pub struct CountdownSnapshot {
    pub remaining_secs: u64,
    pub total_secs: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PomodoroSnapshot {
    pub phase: Phase,
    pub remaining_secs: u64,
    pub total_secs: u64,
    pub session: u32,
    pub running: bool,
    pub paused: bool,
    pub queued: Phase,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PauseReason {
    Dnd,
    Schedule,
    Idle,
}

#[derive(Debug, Clone, Serialize)]
pub struct DndSnapshot {
    pub enabled: bool,
    pub until: Option<String>,
}

/// Full live state, sent every second and on demand.
#[derive(Debug, Clone, Serialize)]
pub struct AppStateSnapshot {
    pub water: CountdownSnapshot,
    pub movement: CountdownSnapshot,
    pub pomodoro: PomodoroSnapshot,
    pub paused_reason: Option<PauseReason>,
    pub dnd: DndSnapshot,
    pub idle_secs: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReminderEvent {
    pub id: u64,
    /// "water" | "movement" | "pomodoro"
    pub kind: &'static str,
    pub message: String,
    /// Exercise id for movement, "work_complete" / "break_complete" for pomodoro.
    pub data: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PomodoroEvent {
    /// "started" | "work_complete" | "break_complete" | "stopped" | "paused" | "resumed"
    pub event: &'static str,
    pub phase: Phase,
    pub remaining_secs: u64,
    pub total_secs: u64,
    pub session: u32,
}

// ─── Countdown ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct Countdown {
    interval: Duration,
    deadline: Option<DateTime<Utc>>,
    paused_remaining: Option<Duration>,
}

impl Countdown {
    pub fn new(minutes: u32, now: DateTime<Utc>) -> Self {
        let interval = Duration::minutes(minutes.max(1) as i64);
        Self {
            interval,
            deadline: Some(now + interval),
            paused_remaining: None,
        }
    }

    pub fn interval_minutes(&self) -> u32 {
        self.interval.num_minutes().max(1) as u32
    }

    pub fn total_secs(&self) -> u64 {
        self.interval.num_seconds().max(0) as u64
    }

    pub fn remaining_secs(&self, now: DateTime<Utc>) -> u64 {
        if let Some(r) = self.paused_remaining {
            return r.num_seconds().max(0) as u64;
        }
        self.deadline
            .map(|d| (d - now).num_seconds().max(0) as u64)
            .unwrap_or(0)
    }

    pub fn is_paused(&self) -> bool {
        self.paused_remaining.is_some()
    }

    pub fn pause(&mut self, now: DateTime<Utc>) {
        if self.paused_remaining.is_some() {
            return;
        }
        let remaining = self
            .deadline
            .map(|d| (d - now).max(Duration::zero()))
            .unwrap_or(self.interval);
        self.paused_remaining = Some(remaining);
        self.deadline = None;
    }

    pub fn resume(&mut self, now: DateTime<Utc>) {
        if let Some(r) = self.paused_remaining.take() {
            // Never resume into an immediate fire; give the user a short grace.
            let r = if r < Duration::seconds(30) {
                Duration::seconds(30)
            } else {
                r
            };
            self.deadline = Some(now + r);
        }
    }

    pub fn reset(&mut self, now: DateTime<Utc>) {
        if self.paused_remaining.is_some() {
            self.paused_remaining = Some(self.interval);
        } else {
            self.deadline = Some(now + self.interval);
        }
    }

    pub fn set_interval(&mut self, minutes: u32, now: DateTime<Utc>) {
        let new = Duration::minutes(minutes.max(1) as i64);
        if new != self.interval {
            self.interval = new;
            self.reset(now);
        }
    }

    /// Fire again after `minutes`, regardless of pause state.
    pub fn snooze(&mut self, minutes: u32, now: DateTime<Utc>) {
        let d = Duration::minutes(minutes.max(1) as i64);
        if self.paused_remaining.is_some() {
            self.paused_remaining = Some(d);
        } else {
            self.deadline = Some(now + d);
        }
    }

    /// Returns `true` once when the deadline passes, and rearms.
    pub fn fire_if_due(&mut self, now: DateTime<Utc>) -> bool {
        if self.paused_remaining.is_some() {
            return false;
        }
        match self.deadline {
            Some(d) if now >= d => {
                self.deadline = Some(now + self.interval);
                true
            }
            _ => false,
        }
    }

    pub fn snapshot(&self, now: DateTime<Utc>) -> CountdownSnapshot {
        CountdownSnapshot {
            remaining_secs: self.remaining_secs(now),
            total_secs: self.total_secs(),
        }
    }
}

// ─── Exercise picker ───────────────────────────────────────────────────────

/// Exercise ids known to the frontend (`src/lib/exercises.ts`).
const EXERCISES_ALL: &[&str] = &[
    "neck_rolls",
    "shoulder_shrugs",
    "wrist_circles",
    "arm_cross_stretch",
    "chest_opener",
    "upper_back_stretch",
    "side_bends",
    "forearm_stretch",
    "finger_spread",
    "trapezius_release",
    "seated_spinal_twist",
    "shoulder_blade_squeeze",
    "calf_raises",
    "seated_leg_extensions",
    "hip_flexor_stretch",
    "ankle_circles",
    "glute_squeeze",
    "wall_sit",
    "standing_quad_stretch",
    "hamstring_stretch",
    "toe_raises",
    "knee_lifts",
    "figure_four_stretch",
    "standing_side_leg_raise",
    "eye_20_20_20",
    "eye_circles",
    "palming",
    "focus_shifting",
    "blinking_exercise",
    "figure_eight_tracking",
    "peripheral_awareness",
    "eye_squeeze_release",
    "box_breathing",
    "breathing_4_7_8",
    "deep_belly_breathing",
    "alternate_nostril",
    "pursed_lip_breathing",
    "lions_breath",
    "humming_breath",
    "progressive_muscle_relaxation",
];

/// Exercises that are *not* suitable for a sedentary profile.
const EXERCISES_MODERATE_PLUS: &[&str] = &[
    "side_bends",
    "hip_flexor_stretch",
    "wall_sit",
    "standing_quad_stretch",
    "knee_lifts",
    "standing_side_leg_raise",
    "lions_breath",
];

/// Pick an exercise suitable for `work_style`, avoiding the most recent ones.
pub fn pick_exercise(work_style: &str, recent: &[String]) -> String {
    let pool: Vec<&str> = EXERCISES_ALL
        .iter()
        .copied()
        .filter(|id| work_style != "sedentary" || !EXERCISES_MODERATE_PLUS.contains(id))
        .filter(|id| !recent.iter().any(|r| r == id))
        .collect();
    let pool = if pool.is_empty() {
        EXERCISES_ALL.to_vec()
    } else {
        pool
    };
    pool.choose(&mut rand::thread_rng())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "neck_rolls".to_string())
}

// ─── State ─────────────────────────────────────────────────────────────────

pub struct SchedulerState {
    pub water: Countdown,
    pub movement: Countdown,
    pub pomodoro: Pomodoro,
    pub paused_reason: Option<PauseReason>,
    pub idle_secs: u64,
    pub work_style: String,
    recent_exercises: Vec<String>,
    next_reminder_id: u64,
    /// Current pomodoro log row.
    pomodoro_log_id: Option<i64>,
    /// Pending widget position to persist (debounced).
    widget_pos: Option<((i32, i32), Instant)>,
    last_tray_key: String,
}

impl SchedulerState {
    pub fn new(cfg: &AppConfig, work_style: String) -> Self {
        let now = Utc::now();
        Self {
            water: Countdown::new(cfg.water_interval_min, now),
            movement: Countdown::new(cfg.movement_interval_min, now),
            pomodoro: Pomodoro::default(),
            paused_reason: None,
            idle_secs: 0,
            work_style,
            recent_exercises: Vec::new(),
            next_reminder_id: 1,
            pomodoro_log_id: None,
            widget_pos: None,
            last_tray_key: String::new(),
        }
    }

    pub fn snapshot(&self, cfg: &AppConfig, now: DateTime<Utc>) -> AppStateSnapshot {
        AppStateSnapshot {
            water: self.water.snapshot(now),
            movement: self.movement.snapshot(now),
            pomodoro: self.pomodoro_snapshot(now),
            paused_reason: self.paused_reason,
            dnd: DndSnapshot {
                enabled: cfg.dnd_enabled,
                until: if cfg.dnd_until.is_empty() {
                    None
                } else {
                    Some(cfg.dnd_until.clone())
                },
            },
            idle_secs: self.idle_secs,
        }
    }

    pub fn pomodoro_snapshot(&self, now: DateTime<Utc>) -> PomodoroSnapshot {
        PomodoroSnapshot {
            phase: self.pomodoro.phase,
            remaining_secs: self.pomodoro.remaining_secs(now),
            total_secs: self.pomodoro.total_secs(),
            session: self.pomodoro.session,
            running: self.pomodoro.is_running(),
            paused: self.pomodoro.is_paused(),
            queued: self.pomodoro.queued,
        }
    }

    fn next_id(&mut self) -> u64 {
        let id = self.next_reminder_id;
        self.next_reminder_id += 1;
        id
    }

    pub fn note_widget_moved(&mut self, x: i32, y: i32) {
        self.widget_pos = Some(((x, y), Instant::now()));
    }
}

pub type Scheduler = Arc<Mutex<SchedulerState>>;

/// Information the tray needs, computed while the lock is held and applied after.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TrayInfo {
    pub pomodoro_running: bool,
    pub pomodoro_paused: bool,
    pub dnd: bool,
    pub tooltip: String,
}

// ─── Loop ──────────────────────────────────────────────────────────────────

pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticker = tokio::time::interval(std::time::Duration::from_secs(1));
        ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        loop {
            ticker.tick().await;
            tick(&app);
        }
    });
}

fn tick(app: &AppHandle) {
    let config_state = app.state::<ConfigState>();
    let mut cfg = config_state.get();
    let now = Utc::now();

    // Timed DND expiry.
    if cfg.dnd_enabled && !cfg.dnd_until.is_empty() {
        let expired = DateTime::parse_from_rfc3339(&cfg.dnd_until)
            .map(|t| now >= t.with_timezone(&Utc))
            .unwrap_or(true);
        if expired {
            let mut next = cfg.clone();
            next.dnd_enabled = false;
            next.dnd_until.clear();
            crate::commands::config::commit_config(app, next.clone());
            cfg = next;
        }
    }

    let idle_secs = if cfg.idle_pause_enabled {
        idle::idle_seconds().unwrap_or(0)
    } else {
        0
    };

    let mut reminders: Vec<ReminderEvent> = Vec::new();
    let mut pomo_events: Vec<PomodoroEvent> = Vec::new();
    let mut pomo_log_ops: Vec<PomoLogOp> = Vec::new();
    let mut widget_pos_to_save: Option<(i32, i32)> = None;
    let snapshot;
    let tray_info;
    let tray_changed;

    {
        let scheduler = app.state::<Scheduler>();
        let Ok(mut st) = scheduler.lock() else {
            return;
        };
        st.idle_secs = idle_secs;

        // Pause reason, by priority.
        let reason = if cfg.dnd_enabled {
            Some(PauseReason::Dnd)
        } else if !schedule::is_within_schedule(&cfg, Local::now()) {
            Some(PauseReason::Schedule)
        } else if cfg.idle_pause_enabled && idle_secs >= cfg.idle_threshold_min as u64 * 60 {
            Some(PauseReason::Idle)
        } else {
            None
        };
        if reason != st.paused_reason {
            match reason {
                Some(r) => log::info!("reminders paused: {r:?} (idle {idle_secs}s)"),
                None => log::info!("reminders resumed"),
            }
            st.paused_reason = reason;
            if reason.is_some() {
                st.water.pause(now);
                st.movement.pause(now);
            } else {
                st.water.resume(now);
                st.movement.resume(now);
            }
        }

        // Water / movement.
        if st.water.fire_if_due(now) {
            let id = st.next_id();
            reminders.push(ReminderEvent {
                id,
                kind: "water",
                message: "Time for a glass of water".into(),
                data: None,
            });
        }
        if st.movement.fire_if_due(now) {
            let exercise = pick_exercise(&st.work_style, &st.recent_exercises);
            st.recent_exercises.push(exercise.clone());
            if st.recent_exercises.len() > 6 {
                st.recent_exercises.remove(0);
            }
            let id = st.next_id();
            reminders.push(ReminderEvent {
                id,
                kind: "movement",
                message: "Time to move".into(),
                data: Some(exercise),
            });
        }

        // Pomodoro.
        if let Some(tr) = st.pomodoro.tick(now, &cfg) {
            handle_transition(
                &mut st,
                tr,
                now,
                &mut reminders,
                &mut pomo_events,
                &mut pomo_log_ops,
            );
        }

        // Widget position debounce (1 s after the last move).
        if let Some((pos, at)) = st.widget_pos {
            if at.elapsed().as_millis() > 1000 {
                widget_pos_to_save = Some(pos);
                st.widget_pos = None;
            }
        }

        snapshot = st.snapshot(&cfg, now);
        tray_info = tray_info_for(&st, &cfg, now);
        let key = format!("{tray_info:?}");
        tray_changed = key != st.last_tray_key;
        if tray_changed {
            st.last_tray_key = key;
        }
    }

    // ── Side effects, lock released ──
    for op in pomo_log_ops {
        apply_pomo_log(app, op);
    }
    for ev in pomo_events {
        let _ = app.emit(EV_POMODORO, &ev);
    }
    for r in reminders {
        deliver_reminder(app, &cfg, r);
    }
    if let Some((x, y)) = widget_pos_to_save {
        let mut next = cfg.clone();
        next.widget_x = Some(x);
        next.widget_y = Some(y);
        crate::commands::config::commit_config_quiet(app, next);
    }
    if tray_changed {
        crate::tray::refresh(app, &tray_info);
    }
    let _ = app.emit(EV_TICK, &snapshot);
}

fn tray_info_for(st: &SchedulerState, cfg: &AppConfig, now: DateTime<Utc>) -> TrayInfo {
    let tooltip = if cfg.dnd_enabled {
        "Haysu — Do Not Disturb".to_string()
    } else if let Some(reason) = st.paused_reason {
        match reason {
            PauseReason::Schedule => "Haysu — outside work hours".to_string(),
            PauseReason::Idle => "Haysu — paused while you're away".to_string(),
            PauseReason::Dnd => "Haysu — Do Not Disturb".to_string(),
        }
    } else {
        let w = st.water.remaining_secs(now) / 60;
        let m = st.movement.remaining_secs(now) / 60;
        let mut s = format!("Haysu — water in {w}m · move in {m}m");
        if st.pomodoro.is_running() {
            let p = st.pomodoro.remaining_secs(now);
            s.push_str(&format!(
                " · {} {:02}:{:02}",
                match st.pomodoro.phase {
                    Phase::Work => "focus",
                    _ => "break",
                },
                p / 60,
                p % 60
            ));
        }
        s
    };
    TrayInfo {
        pomodoro_running: st.pomodoro.is_running(),
        pomodoro_paused: st.pomodoro.is_paused(),
        dnd: cfg.dnd_enabled,
        tooltip,
    }
}

enum PomoLogOp {
    Start { phase: Phase },
    End { id: i64, completed: bool },
}

fn handle_transition(
    st: &mut SchedulerState,
    tr: Transition,
    now: DateTime<Utc>,
    reminders: &mut Vec<ReminderEvent>,
    events: &mut Vec<PomodoroEvent>,
    log_ops: &mut Vec<PomoLogOp>,
) {
    let snap = |st: &SchedulerState, event: &'static str| PomodoroEvent {
        event,
        phase: st.pomodoro.phase,
        remaining_secs: st.pomodoro.remaining_secs(now),
        total_secs: st.pomodoro.total_secs(),
        session: st.pomodoro.session,
    };
    match tr {
        Transition::Started(phase) => {
            log_ops.push(PomoLogOp::Start { phase });
            events.push(snap(st, "started"));
        }
        Transition::Stopped { .. } => {
            if let Some(id) = st.pomodoro_log_id.take() {
                log_ops.push(PomoLogOp::End {
                    id,
                    completed: false,
                });
            }
            events.push(snap(st, "stopped"));
        }
        Transition::Completed {
            finished,
            natural,
            next,
        } => {
            if let Some(id) = st.pomodoro_log_id.take() {
                log_ops.push(PomoLogOp::End {
                    id,
                    completed: natural,
                });
            }
            if next != Phase::Idle {
                log_ops.push(PomoLogOp::Start { phase: next });
            }
            let (event, data, message) = if finished == Phase::Work {
                (
                    "work_complete",
                    "work_complete",
                    "Work session complete. Time for a break.",
                )
            } else {
                (
                    "break_complete",
                    "break_complete",
                    "Break is over. Ready to focus?",
                )
            };
            events.push(snap(st, event));
            if natural {
                let id = st.next_id();
                reminders.push(ReminderEvent {
                    id,
                    kind: "pomodoro",
                    message: message.into(),
                    data: Some(data.into()),
                });
            }
        }
    }
}

fn apply_pomo_log(app: &AppHandle, op: PomoLogOp) {
    let db = app.state::<DbState>();
    let Ok(conn) = db.conn.lock() else { return };
    match op {
        PomoLogOp::Start { phase } => {
            let res = conn.execute(
                "INSERT INTO pomodoro_log (started_at, session_type, completed) VALUES (?1, ?2, 0)",
                rusqlite::params![time::now_utc(), phase.as_str()],
            );
            if res.is_ok() {
                let id = conn.last_insert_rowid();
                drop(conn);
                if let Ok(mut st) = app.state::<Scheduler>().lock() {
                    st.pomodoro_log_id = Some(id);
                }
            } else if let Err(e) = res {
                log::warn!("pomodoro log start failed: {e}");
            }
        }
        PomoLogOp::End { id, completed } => {
            if let Err(e) = conn.execute(
                "UPDATE pomodoro_log SET ended_at = ?1, completed = ?2 WHERE id = ?3",
                rusqlite::params![time::now_utc(), completed as i32, id],
            ) {
                log::warn!("pomodoro log end failed: {e}");
            }
        }
    }
}

fn deliver_reminder(app: &AppHandle, cfg: &AppConfig, r: ReminderEvent) {
    log::info!("reminder: {} ({:?})", r.kind, r.data);
    let native = matches!(
        cfg.reminder_style,
        ReminderStyle::Native | ReminderStyle::Both
    );
    let popup = matches!(
        cfg.reminder_style,
        ReminderStyle::Popup | ReminderStyle::Both
    );
    if native {
        let title = match r.kind {
            "water" => "Haysu · Water",
            "movement" => "Haysu · Move",
            _ => "Haysu · Pomodoro",
        };
        crate::notify::native(app, title, &r.message);
    }
    if popup {
        crate::windows::show_popup(app);
    }
    let _ = app.emit(EV_REMINDER, &r);
}

// ─── Operations used by commands, hotkeys and the tray ─────────────────────

/// Run `f` against the scheduler state and flush any resulting events.
pub fn with_state<T>(
    app: &AppHandle,
    f: impl FnOnce(&mut SchedulerState, &AppConfig, DateTime<Utc>) -> T,
) -> Option<T> {
    let cfg = app.state::<ConfigState>().get();
    let scheduler = app.state::<Scheduler>();
    let mut st = scheduler.lock().ok()?;
    Some(f(&mut st, &cfg, Utc::now()))
}

/// Apply a pomodoro transition produced outside the tick loop.
pub fn pomodoro_command(app: &AppHandle, action: &str) {
    let cfg = app.state::<ConfigState>().get();
    let now = Utc::now();
    let mut reminders = Vec::new();
    let mut events = Vec::new();
    let mut log_ops = Vec::new();
    {
        let scheduler = app.state::<Scheduler>();
        let Ok(mut st) = scheduler.lock() else { return };
        let was_paused = st.pomodoro.is_paused();
        let tr = match action {
            "start" => st.pomodoro.start(now, &cfg),
            "pause" => {
                st.pomodoro.pause(now);
                None
            }
            "resume" => {
                st.pomodoro.resume(now);
                None
            }
            "toggle" => st.pomodoro.toggle(now, &cfg),
            "stop" => st.pomodoro.stop(),
            "skip" => st.pomodoro.skip(now, &cfg),
            _ => None,
        };
        match tr {
            Some(tr) => {
                handle_transition(&mut st, tr, now, &mut reminders, &mut events, &mut log_ops)
            }
            None => {
                let is_paused = st.pomodoro.is_paused();
                if is_paused != was_paused && st.pomodoro.is_running() {
                    events.push(PomodoroEvent {
                        event: if is_paused { "paused" } else { "resumed" },
                        phase: st.pomodoro.phase,
                        remaining_secs: st.pomodoro.remaining_secs(now),
                        total_secs: st.pomodoro.total_secs(),
                        session: st.pomodoro.session,
                    });
                }
            }
        }
    }
    for op in log_ops {
        apply_pomo_log(app, op);
    }
    for ev in events {
        let _ = app.emit(EV_POMODORO, &ev);
    }
    for r in reminders {
        deliver_reminder(app, &cfg, r);
    }
    // Push a fresh snapshot right away so UIs don't wait up to a second.
    emit_snapshot(app);
}

pub fn emit_snapshot(app: &AppHandle) {
    let cfg = app.state::<ConfigState>().get();
    if let Some(snap) = with_state(app, |st, _, now| st.snapshot(&cfg, now)) {
        let _ = app.emit(EV_TICK, &snap);
    }
}

/// React to a config change: intervals and durations.
pub fn apply_config(app: &AppHandle, old: &AppConfig, new: &AppConfig) {
    with_state(app, |st, _, now| {
        if old.water_interval_min != new.water_interval_min {
            st.water.set_interval(new.water_interval_min, now);
        }
        if old.movement_interval_min != new.movement_interval_min {
            st.movement.set_interval(new.movement_interval_min, now);
        }
        st.pomodoro.apply_config(new);
    });
    emit_snapshot(app);
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn t0() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 3, 11, 9, 0, 0).unwrap()
    }

    #[test]
    fn countdown_fires_once_and_rearms() {
        let mut c = Countdown::new(30, t0());
        assert!(!c.fire_if_due(t0() + Duration::minutes(29)));
        assert!(c.fire_if_due(t0() + Duration::minutes(30)));
        assert!(!c.fire_if_due(t0() + Duration::minutes(30)));
        assert_eq!(c.remaining_secs(t0() + Duration::minutes(30)), 30 * 60);
    }

    #[test]
    fn pause_freezes_and_resume_continues() {
        let mut c = Countdown::new(30, t0());
        c.pause(t0() + Duration::minutes(10));
        assert_eq!(c.remaining_secs(t0() + Duration::hours(5)), 20 * 60);
        assert!(!c.fire_if_due(t0() + Duration::hours(5)));
        c.resume(t0() + Duration::hours(5));
        assert!(c.fire_if_due(t0() + Duration::hours(5) + Duration::minutes(20)));
    }

    #[test]
    fn resume_has_grace_period() {
        let mut c = Countdown::new(30, t0());
        c.pause(t0() + Duration::minutes(29) + Duration::seconds(55));
        c.resume(t0() + Duration::hours(1));
        assert!(c.remaining_secs(t0() + Duration::hours(1)) >= 29);
    }

    #[test]
    fn snooze_overrides_deadline() {
        let mut c = Countdown::new(30, t0());
        c.snooze(5, t0());
        assert!(c.fire_if_due(t0() + Duration::minutes(5)));
        assert_eq!(c.interval_minutes(), 30, "snooze keeps the interval");
    }

    #[test]
    fn set_interval_resets_only_on_change() {
        let mut c = Countdown::new(30, t0());
        let before = c.remaining_secs(t0() + Duration::minutes(10));
        c.set_interval(30, t0() + Duration::minutes(10));
        assert_eq!(c.remaining_secs(t0() + Duration::minutes(10)), before);
        c.set_interval(15, t0() + Duration::minutes(10));
        assert_eq!(c.remaining_secs(t0() + Duration::minutes(10)), 15 * 60);
    }

    #[test]
    fn sedentary_never_gets_vigorous_exercises() {
        for _ in 0..200 {
            let id = pick_exercise("sedentary", &[]);
            assert!(!EXERCISES_MODERATE_PLUS.contains(&id.as_str()), "{id}");
        }
    }

    #[test]
    fn picker_avoids_recent() {
        let recent: Vec<String> = vec!["neck_rolls".into(), "palming".into()];
        for _ in 0..100 {
            let id = pick_exercise("active", &recent);
            assert!(!recent.contains(&id));
        }
    }
}
