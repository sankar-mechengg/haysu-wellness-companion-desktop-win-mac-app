use std::sync::atomic::{AtomicBool, AtomicU64, AtomicU8, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use super::{ReminderEvent, TimerTickEvent};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PomodoroPhase {
    Idle,
    Work,
    ShortBreak,
    LongBreak,
}

impl PomodoroPhase {
    pub fn as_str(&self) -> &'static str {
        match self {
            PomodoroPhase::Idle => "idle",
            PomodoroPhase::Work => "work",
            PomodoroPhase::ShortBreak => "short_break",
            PomodoroPhase::LongBreak => "long_break",
        }
    }
}

/// Shared state for pomodoro timer control
pub struct PomodoroTimerState {
    pub running: AtomicBool,
    pub paused: AtomicBool,
    pub work_secs: AtomicU64,
    pub short_break_secs: AtomicU64,
    pub long_break_secs: AtomicU64,
    pub sessions_before_long: AtomicU8,
    pub current_session: AtomicU8,
    pub remaining_secs: AtomicU64,
    pub phase: Mutex<PomodoroPhase>,
    pub current_log_id: AtomicU64,
}

impl Default for PomodoroTimerState {
    fn default() -> Self {
        Self {
            running: AtomicBool::new(false),
            paused: AtomicBool::new(false),
            work_secs: AtomicU64::new(25 * 60),
            short_break_secs: AtomicU64::new(5 * 60),
            long_break_secs: AtomicU64::new(15 * 60),
            sessions_before_long: AtomicU8::new(4),
            current_session: AtomicU8::new(0),
            remaining_secs: AtomicU64::new(25 * 60),
            phase: Mutex::new(PomodoroPhase::Idle),
            current_log_id: AtomicU64::new(0),
        }
    }
}

/// Start the pomodoro background loop
pub fn start_pomodoro_loop(app: AppHandle) {
    let timer_state = app.state::<Arc<PomodoroTimerState>>().inner().clone();
    let app_handle = app.clone();

    tokio::spawn(async move {
        loop {
            if !timer_state.running.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_millis(500)).await;
                continue;
            }

            if timer_state.paused.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_secs(1)).await;
                continue;
            }

            let phase = { *timer_state.phase.lock().unwrap() };
            if phase == PomodoroPhase::Idle {
                tokio::time::sleep(Duration::from_millis(500)).await;
                continue;
            }

            let remaining = timer_state.remaining_secs.load(Ordering::SeqCst);

            if remaining == 0 {
                // Phase complete — emit event and transition
                let next_phase = match phase {
                    PomodoroPhase::Work => {
                        let session = timer_state.current_session.fetch_add(1, Ordering::SeqCst) + 1;
                        let max_sessions = timer_state.sessions_before_long.load(Ordering::SeqCst);

                        // Emit work complete
                        let _ = app_handle.emit(
                            "reminder",
                            ReminderEvent {
                                reminder_type: "pomodoro".to_string(),
                                message: "Work session complete! Time for a break.".to_string(),
                                data: Some("work_complete".to_string()),
                            },
                        );

                        if session >= max_sessions {
                            timer_state.current_session.store(0, Ordering::SeqCst);
                            PomodoroPhase::LongBreak
                        } else {
                            PomodoroPhase::ShortBreak
                        }
                    }
                    PomodoroPhase::ShortBreak | PomodoroPhase::LongBreak => {
                        let _ = app_handle.emit(
                            "reminder",
                            ReminderEvent {
                                reminder_type: "pomodoro".to_string(),
                                message: "Break is over! Ready to focus?".to_string(),
                                data: Some("break_complete".to_string()),
                            },
                        );
                        PomodoroPhase::Idle // Wait for user to start next work session
                    }
                    PomodoroPhase::Idle => PomodoroPhase::Idle,
                };

                let new_remaining = match next_phase {
                    PomodoroPhase::Work => timer_state.work_secs.load(Ordering::SeqCst),
                    PomodoroPhase::ShortBreak => timer_state.short_break_secs.load(Ordering::SeqCst),
                    PomodoroPhase::LongBreak => timer_state.long_break_secs.load(Ordering::SeqCst),
                    PomodoroPhase::Idle => 0,
                };

                timer_state.remaining_secs.store(new_remaining, Ordering::SeqCst);
                *timer_state.phase.lock().unwrap() = next_phase;

                // Emit phase change
                let _ = app_handle.emit(
                    "pomodoro-phase",
                    serde_json::json!({
                        "phase": next_phase.as_str(),
                        "remaining_secs": new_remaining,
                        "session": timer_state.current_session.load(Ordering::SeqCst),
                    }),
                );
            } else {
                timer_state.remaining_secs.fetch_sub(1, Ordering::SeqCst);

                // Emit tick every second for pomodoro (users watch this closely)
                let total = match phase {
                    PomodoroPhase::Work => timer_state.work_secs.load(Ordering::SeqCst),
                    PomodoroPhase::ShortBreak => timer_state.short_break_secs.load(Ordering::SeqCst),
                    PomodoroPhase::LongBreak => timer_state.long_break_secs.load(Ordering::SeqCst),
                    PomodoroPhase::Idle => 0,
                };

                let _ = app_handle.emit(
                    "timer-tick",
                    TimerTickEvent {
                        timer_type: format!("pomodoro_{}", phase.as_str()),
                        remaining_secs: remaining - 1,
                        total_secs: total,
                    },
                );
            }

            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    });
}

// ─── Commands ───

#[tauri::command]
pub fn start_pomodoro(app: AppHandle) {
    let state = app.state::<Arc<PomodoroTimerState>>();
    state.running.store(true, Ordering::SeqCst);
    state.paused.store(false, Ordering::SeqCst);
    let work_secs = state.work_secs.load(Ordering::SeqCst);
    state.remaining_secs.store(work_secs, Ordering::SeqCst);
    *state.phase.lock().unwrap() = PomodoroPhase::Work;

    let _ = app.emit(
        "pomodoro-phase",
        serde_json::json!({
            "phase": "work",
            "remaining_secs": work_secs,
            "session": state.current_session.load(Ordering::SeqCst),
        }),
    );
}

#[tauri::command]
pub fn pause_pomodoro(app: AppHandle) {
    let state = app.state::<Arc<PomodoroTimerState>>();
    state.paused.store(true, Ordering::SeqCst);
}

#[tauri::command]
pub fn resume_pomodoro(app: AppHandle) {
    let state = app.state::<Arc<PomodoroTimerState>>();
    state.paused.store(false, Ordering::SeqCst);
}

#[tauri::command]
pub fn stop_pomodoro(app: AppHandle) {
    let state = app.state::<Arc<PomodoroTimerState>>();
    state.running.store(false, Ordering::SeqCst);
    state.paused.store(false, Ordering::SeqCst);
    state.current_session.store(0, Ordering::SeqCst);
    *state.phase.lock().unwrap() = PomodoroPhase::Idle;

    let _ = app.emit(
        "pomodoro-phase",
        serde_json::json!({
            "phase": "idle",
            "remaining_secs": 0,
            "session": 0,
        }),
    );
}

#[tauri::command]
pub fn skip_pomodoro_phase(app: AppHandle) {
    let state = app.state::<Arc<PomodoroTimerState>>();
    state.remaining_secs.store(0, Ordering::SeqCst);
}

#[tauri::command]
pub fn get_pomodoro_state(app: AppHandle) -> serde_json::Value {
    let state = app.state::<Arc<PomodoroTimerState>>();
    let phase = { *state.phase.lock().unwrap() };
    serde_json::json!({
        "phase": phase.as_str(),
        "remaining_secs": state.remaining_secs.load(Ordering::SeqCst),
        "session": state.current_session.load(Ordering::SeqCst),
        "is_running": state.running.load(Ordering::SeqCst),
        "is_paused": state.paused.load(Ordering::SeqCst),
    })
}

#[tauri::command]
pub fn toggle_pomodoro(app: AppHandle) {
    let state = app.state::<Arc<PomodoroTimerState>>();
    let phase = { *state.phase.lock().unwrap() };

    if phase == PomodoroPhase::Idle {
        // Start new work session
        start_pomodoro(app);
    } else if state.paused.load(Ordering::SeqCst) {
        resume_pomodoro(app);
    } else {
        pause_pomodoro(app);
    }
}
