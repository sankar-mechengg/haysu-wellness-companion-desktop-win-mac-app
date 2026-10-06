//! Configuration commands and the single place where a config change is
//! persisted and propagated to every subsystem.

use chrono::{Duration, Utc};
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};

use crate::config::{AppConfig, ConfigState};
use crate::db::DbState;
use crate::hotkeys::{self, HotkeyError, HotkeyStatus};
use crate::{autostart, scheduler, windows};

pub const EV_CONFIG: &str = "config-changed";

#[derive(Debug, Clone, Serialize)]
pub struct ConfigResult {
    pub config: AppConfig,
    pub hotkey_errors: Vec<HotkeyError>,
}

/// Persist `next`, update managed state, apply side effects and broadcast.
pub fn commit_config(app: &AppHandle, next: AppConfig) -> ConfigResult {
    let state = app.state::<ConfigState>();
    let old = state.get();

    if let Ok(conn) = app.state::<DbState>().conn.lock() {
        if let Err(e) = next.save(&conn) {
            log::error!("saving config failed: {e}");
        }
    }
    state.set(next.clone());

    scheduler::apply_config(app, &old, &next);

    let hotkeys_changed = old.hotkey_toggle_pomodoro != next.hotkey_toggle_pomodoro
        || old.hotkey_toggle_dnd != next.hotkey_toggle_dnd
        || old.hotkey_show_dashboard != next.hotkey_show_dashboard
        || old.hotkey_log_water != next.hotkey_log_water;
    let hotkey_errors = if hotkeys_changed {
        hotkeys::apply(app, &next)
    } else {
        app.state::<HotkeyStatus>()
            .0
            .lock()
            .map(|s| s.clone())
            .unwrap_or_default()
    };

    if old.autostart_enabled != next.autostart_enabled {
        if let Err(e) = autostart::apply(app, next.autostart_enabled) {
            log::warn!("autostart change failed: {e}");
        }
    }

    windows::apply_widget_prefs(app, &old, &next);

    let _ = app.emit(EV_CONFIG, &next);
    ConfigResult {
        config: next,
        hotkey_errors,
    }
}

/// Persist and broadcast without applying side effects (used for bookkeeping
/// fields such as the widget position).
pub fn commit_config_quiet(app: &AppHandle, next: AppConfig) {
    let state = app.state::<ConfigState>();
    if let Ok(conn) = app.state::<DbState>().conn.lock() {
        if let Err(e) = next.save(&conn) {
            log::error!("saving config failed: {e}");
        }
    }
    state.set(next.clone());
    let _ = app.emit(EV_CONFIG, &next);
}

pub fn set_dnd_internal(app: &AppHandle, enabled: bool, minutes: Option<u32>) {
    let mut next = app.state::<ConfigState>().get();
    next.dnd_enabled = enabled;
    next.dnd_until = match (enabled, minutes) {
        (true, Some(m)) if m > 0 => (Utc::now() + Duration::minutes(m as i64)).to_rfc3339(),
        _ => String::new(),
    };
    commit_config(app, next);
    scheduler::emit_snapshot(app);
}

pub fn toggle_dnd_internal(app: &AppHandle, minutes: Option<u32>) {
    let current = app.state::<ConfigState>().get().dnd_enabled;
    set_dnd_internal(app, !current, minutes);
}

// ─── Tauri commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_config(app: AppHandle) -> AppConfig {
    app.state::<ConfigState>().get()
}

#[tauri::command]
pub fn update_config(app: AppHandle, patch: Value) -> Result<ConfigResult, String> {
    let current = app.state::<ConfigState>().get();
    let next = current.merge_patch(&patch)?;
    Ok(commit_config(&app, next))
}

#[tauri::command]
pub fn set_dnd(app: AppHandle, enabled: bool, minutes: Option<u32>) {
    set_dnd_internal(&app, enabled, minutes);
}

#[tauri::command]
pub fn toggle_dnd(app: AppHandle, minutes: Option<u32>) {
    toggle_dnd_internal(&app, minutes);
}

#[tauri::command]
pub fn get_hotkey_status(app: AppHandle) -> Vec<HotkeyError> {
    app.state::<HotkeyStatus>()
        .0
        .lock()
        .map(|s| s.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn validate_hotkey(combo: String) -> Result<(), String> {
    hotkeys::validate(&combo)
}

/// Mark onboarding complete, close the wizard and show the widget.
#[tauri::command]
pub async fn complete_onboarding(app: AppHandle) {
    let mut next = app.state::<ConfigState>().get();
    next.onboarding_complete = true;
    commit_config(&app, next);
    windows::hide_window(&app, windows::ONBOARDING);
    windows::show_widget(&app);
}

/// Delete activity logs (`scope = "logs"`) or everything including the
/// profile and settings (`scope = "all"`).
#[tauri::command]
pub async fn reset_data(app: AppHandle, scope: String) -> Result<(), String> {
    {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(
            "DELETE FROM water_log; DELETE FROM movement_log; DELETE FROM pomodoro_log;",
        )
        .map_err(|e| e.to_string())?;
        if scope == "all" {
            conn.execute_batch("DELETE FROM user_profile; DELETE FROM settings;")
                .map_err(|e| e.to_string())?;
        }
    }
    let _ = app.emit("activity-logged", "reset");
    if scope == "all" {
        commit_config(&app, AppConfig::default());
        scheduler::with_state(&app, |st, _, _| st.work_style = "sedentary".into());
        windows::hide_window(&app, windows::WIDGET);
        windows::hide_window(&app, windows::DASHBOARD);
        windows::hide_window(&app, windows::SETTINGS);
        windows::ensure_window(&app, windows::ONBOARDING);
    }
    Ok(())
}
