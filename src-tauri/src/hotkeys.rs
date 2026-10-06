//! Global hotkeys, driven by the user's configuration.

use std::str::FromStr;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::config::AppConfig;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct HotkeyError {
    /// Config field name, e.g. `hotkey_toggle_pomodoro`.
    pub field: String,
    pub combo: String,
    pub error: String,
}

/// Last registration result, readable by the UI.
pub struct HotkeyStatus(pub Mutex<Vec<HotkeyError>>);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Action {
    TogglePomodoro,
    ToggleDnd,
    ShowDashboard,
    LogWater,
}

fn bindings(cfg: &AppConfig) -> Vec<(&'static str, String, Action)> {
    vec![
        (
            "hotkey_toggle_pomodoro",
            cfg.hotkey_toggle_pomodoro.clone(),
            Action::TogglePomodoro,
        ),
        (
            "hotkey_toggle_dnd",
            cfg.hotkey_toggle_dnd.clone(),
            Action::ToggleDnd,
        ),
        (
            "hotkey_show_dashboard",
            cfg.hotkey_show_dashboard.clone(),
            Action::ShowDashboard,
        ),
        (
            "hotkey_log_water",
            cfg.hotkey_log_water.clone(),
            Action::LogWater,
        ),
    ]
}

/// (Re)register every configured hotkey. Returns the errors for any that failed.
pub fn apply(app: &AppHandle, cfg: &AppConfig) -> Vec<HotkeyError> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    let mut errors = Vec::new();
    let mut seen: Vec<Shortcut> = Vec::new();

    for (field, combo, action) in bindings(cfg) {
        if combo.trim().is_empty() {
            continue;
        }
        let shortcut = match Shortcut::from_str(&combo) {
            Ok(s) => s,
            Err(e) => {
                errors.push(HotkeyError {
                    field: field.into(),
                    combo,
                    error: format!("invalid shortcut: {e}"),
                });
                continue;
            }
        };
        if seen.contains(&shortcut) {
            errors.push(HotkeyError {
                field: field.into(),
                combo,
                error: "already used by another Haysu action".into(),
            });
            continue;
        }
        let result = gs.on_shortcut(shortcut, move |app, _s, event| {
            if event.state == ShortcutState::Pressed {
                run(app, action);
            }
        });
        match result {
            Ok(()) => seen.push(shortcut),
            Err(e) => errors.push(HotkeyError {
                field: field.into(),
                combo,
                error: format!("could not register (in use by another app?): {e}"),
            }),
        }
    }

    for e in &errors {
        log::warn!("hotkey {} = {}: {}", e.field, e.combo, e.error);
    }
    if let Ok(mut status) = app.state::<HotkeyStatus>().0.lock() {
        *status = errors.clone();
    }
    errors
}

fn run(app: &AppHandle, action: Action) {
    log::info!("hotkey: {action:?}");
    match action {
        Action::TogglePomodoro => crate::scheduler::pomodoro_command(app, "toggle"),
        Action::ToggleDnd => crate::commands::config::toggle_dnd_internal(app, None),
        Action::ShowDashboard => {
            crate::windows::ensure_window(app, crate::windows::DASHBOARD);
        }
        Action::LogWater => crate::commands::stats::quick_log_water(app),
    }
}

/// Validate a combo string without registering it.
pub fn validate(combo: &str) -> Result<(), String> {
    Shortcut::from_str(combo)
        .map(|_| ())
        .map_err(|e| e.to_string())
}
