use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;

/// Enable autostart — app launches when OS boots
pub fn enable_autostart(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let autostart = app.autolaunch();
    if !autostart.is_enabled()? {
        autostart.enable()?;
        println!("[Haysu] Autostart enabled");
    }
    Ok(())
}

/// Disable autostart
pub fn disable_autostart(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let autostart = app.autolaunch();
    if autostart.is_enabled()? {
        autostart.disable()?;
        println!("[Haysu] Autostart disabled");
    }
    Ok(())
}

/// Check if autostart is currently enabled
pub fn is_autostart_enabled(app: &AppHandle) -> Result<bool, Box<dyn std::error::Error>> {
    let autostart = app.autolaunch();
    Ok(autostart.is_enabled()?)
}

/// Configure autostart based on saved setting
pub fn configure_autostart(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Read the setting from the database
    let db = app.state::<crate::db::init::DbState>();
    let conn = db.conn.lock().map_err(|e| -> Box<dyn std::error::Error> { e.to_string().into() })?;
    let enabled: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'autostart_enabled'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "false".to_string());
    drop(conn);

    if enabled == "true" {
        enable_autostart(app)?;
    } else {
        disable_autostart(app)?;
    }
    Ok(())
}

// ─── Tauri Commands ───

#[tauri::command]
pub fn cmd_enable_autostart(app: AppHandle) -> Result<(), String> {
    enable_autostart(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cmd_disable_autostart(app: AppHandle) -> Result<(), String> {
    disable_autostart(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cmd_is_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    is_autostart_enabled(&app).map_err(|e| e.to_string())
}
