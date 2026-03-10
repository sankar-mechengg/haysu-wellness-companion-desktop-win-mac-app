use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use super::{ReminderEvent, TimerTickEvent};

/// Shared state for water timer control
pub struct WaterTimerState {
    pub running: AtomicBool,
    pub paused: AtomicBool,
    pub interval_secs: AtomicU64,
    pub remaining_secs: AtomicU64,
}

impl Default for WaterTimerState {
    fn default() -> Self {
        Self {
            running: AtomicBool::new(false),
            paused: AtomicBool::new(false),
            interval_secs: AtomicU64::new(30 * 60), // 30 minutes
            remaining_secs: AtomicU64::new(30 * 60),
        }
    }
}

/// Start the water reminder background loop
pub fn start_water_timer(app: AppHandle) {
    let state = app.state::<Arc<WaterTimerState>>();
    state.running.store(true, Ordering::SeqCst);
    state.paused.store(false, Ordering::SeqCst);
    let interval = state.interval_secs.load(Ordering::SeqCst);
    state.remaining_secs.store(interval, Ordering::SeqCst);

    let timer_state = app.state::<Arc<WaterTimerState>>().inner().clone();
    let app_handle = app.clone();

    tokio::spawn(async move {
        loop {
            if !timer_state.running.load(Ordering::SeqCst) {
                break;
            }

            if timer_state.paused.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_secs(1)).await;
                continue;
            }

            let remaining = timer_state.remaining_secs.load(Ordering::SeqCst);
            let total = timer_state.interval_secs.load(Ordering::SeqCst);

            if remaining == 0 {
                // Emit reminder event
                let _ = app_handle.emit(
                    "reminder",
                    ReminderEvent {
                        reminder_type: "water".to_string(),
                        message: "Time for a glass of water!".to_string(),
                        data: None,
                    },
                );

                // Reset timer
                timer_state.remaining_secs.store(total, Ordering::SeqCst);
            } else {
                timer_state
                    .remaining_secs
                    .fetch_sub(1, Ordering::SeqCst);

                // Emit tick every 5 seconds to reduce overhead
                if remaining % 5 == 0 {
                    let _ = app_handle.emit(
                        "timer-tick",
                        TimerTickEvent {
                            timer_type: "water".to_string(),
                            remaining_secs: remaining,
                            total_secs: total,
                        },
                    );
                }
            }

            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    });
}

// ─── Commands ───

#[tauri::command]
pub fn set_water_interval(app: AppHandle, minutes: u64) {
    let state = app.state::<Arc<WaterTimerState>>();
    let secs = minutes * 60;
    state.interval_secs.store(secs, Ordering::SeqCst);
    state.remaining_secs.store(secs, Ordering::SeqCst);
}

#[tauri::command]
pub fn pause_water_timer(app: AppHandle) {
    let state = app.state::<Arc<WaterTimerState>>();
    state.paused.store(true, Ordering::SeqCst);
}

#[tauri::command]
pub fn resume_water_timer(app: AppHandle) {
    let state = app.state::<Arc<WaterTimerState>>();
    state.paused.store(false, Ordering::SeqCst);
}

#[tauri::command]
pub fn reset_water_timer(app: AppHandle) {
    let state = app.state::<Arc<WaterTimerState>>();
    let interval = state.interval_secs.load(Ordering::SeqCst);
    state.remaining_secs.store(interval, Ordering::SeqCst);
}

#[tauri::command]
pub fn get_water_timer_state(app: AppHandle) -> super::TimerTickEvent {
    let state = app.state::<Arc<WaterTimerState>>();
    TimerTickEvent {
        timer_type: "water".to_string(),
        remaining_secs: state.remaining_secs.load(Ordering::SeqCst),
        total_secs: state.interval_secs.load(Ordering::SeqCst),
    }
}
