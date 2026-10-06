//! Live timer commands.

use tauri::{AppHandle, Manager};

use crate::config::ConfigState;
use crate::scheduler::{self, AppStateSnapshot};
use crate::windows;

#[tauri::command]
pub fn get_app_state(app: AppHandle) -> Result<AppStateSnapshot, String> {
    let cfg = app.state::<ConfigState>().get();
    scheduler::with_state(&app, |st, _, now| st.snapshot(&cfg, now))
        .ok_or_else(|| "scheduler unavailable".to_string())
}

/// Delay the next water/movement reminder. `minutes` defaults to the configured snooze.
#[tauri::command]
pub fn snooze_reminder(app: AppHandle, kind: String, minutes: Option<u32>) -> Result<(), String> {
    let cfg = app.state::<ConfigState>().get();
    let mins = minutes.unwrap_or(cfg.snooze_minutes).clamp(1, 240);
    scheduler::with_state(&app, |st, _, now| match kind.as_str() {
        "water" => st.water.snooze(mins, now),
        "movement" => st.movement.snooze(mins, now),
        _ => {}
    });
    scheduler::emit_snapshot(&app);
    Ok(())
}

/// Restart a countdown from its full interval.
#[tauri::command]
pub fn reset_reminder(app: AppHandle, kind: String) {
    scheduler::with_state(&app, |st, _, now| match kind.as_str() {
        "water" => st.water.reset(now),
        "movement" => st.movement.reset(now),
        _ => {}
    });
    scheduler::emit_snapshot(&app);
}

/// `action`: start | pause | resume | toggle | stop | skip
#[tauri::command]
pub fn pomodoro_action(app: AppHandle, action: String) {
    scheduler::pomodoro_command(&app, &action);
}

#[tauri::command]
pub fn hide_popup(app: AppHandle) {
    windows::hide_popup(&app);
}
