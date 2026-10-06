//! Window and system commands.

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::windows;

#[derive(Debug, Clone, Serialize)]
pub struct SystemInfo {
    pub version: &'static str,
    pub platform: &'static str,
    pub log_dir: Option<String>,
    pub data_dir: Option<String>,
    pub effects_supported: bool,
}

#[tauri::command]
pub fn get_system_info(app: AppHandle) -> SystemInfo {
    SystemInfo {
        version: env!("CARGO_PKG_VERSION"),
        platform: std::env::consts::OS,
        log_dir: app
            .path()
            .app_log_dir()
            .ok()
            .map(|p| p.to_string_lossy().into_owned()),
        data_dir: app
            .path()
            .app_data_dir()
            .ok()
            .map(|p| p.to_string_lossy().into_owned()),
        effects_supported: windows::effects_supported(),
    }
}

#[tauri::command]
pub async fn show_window(app: AppHandle, label: String) -> Result<(), String> {
    match label.as_str() {
        windows::WIDGET => {
            windows::show_widget(&app);
            Ok(())
        }
        windows::DASHBOARD | windows::SETTINGS | windows::ONBOARDING => {
            windows::ensure_window(&app, &label)
                .map(|_| ())
                .ok_or_else(|| format!("could not open {label}"))
        }
        _ => Err(format!("unknown window {label}")),
    }
}

#[tauri::command]
pub async fn hide_window(app: AppHandle, label: String) {
    windows::hide_window(&app, &label);
}

/// Does the given window have a native translucency effect?
#[tauri::command]
pub fn window_effects_active(app: AppHandle, label: String) -> bool {
    windows::has_effects(&app, &label)
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
