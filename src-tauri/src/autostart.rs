//! Launch-at-login handling.

use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

pub fn is_enabled(app: &AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

/// Bring the OS registration in line with `enabled`.
pub fn apply(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let launcher = app.autolaunch();
    let current = launcher.is_enabled().map_err(|e| e.to_string())?;
    if enabled && !current {
        launcher.enable().map_err(|e| e.to_string())?;
        log::info!("autostart enabled");
    } else if !enabled && current {
        launcher.disable().map_err(|e| e.to_string())?;
        log::info!("autostart disabled");
    }
    Ok(())
}
