use tauri::AppHandle;
use tauri::Emitter;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use std::str::FromStr;

/// Register global hotkeys
/// Ctrl+Shift+J → Toggle Pomodoro (start/pause)
/// Ctrl+Shift+K → Toggle DND mode
pub fn register_hotkeys(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let pomodoro_shortcut = Shortcut::from_str("CmdOrCtrl+Shift+J")?;
    let dnd_shortcut = Shortcut::from_str("CmdOrCtrl+Shift+K")?;

    let app_handle = app.clone();

    app.global_shortcut().on_shortcuts(
        [pomodoro_shortcut, dnd_shortcut],
        move |_app, shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let shortcut_str = shortcut.to_string();
                if shortcut_str.contains("J") || shortcut_str.contains("j") {
                    // Toggle Pomodoro
                    let _ = app_handle.emit("hotkey-action", "toggle_pomodoro");
                    println!("[Haysu] Hotkey: Toggle Pomodoro");
                } else if shortcut_str.contains("K") || shortcut_str.contains("k") {
                    // Toggle DND
                    let _ = app_handle.emit("hotkey-action", "toggle_dnd");
                    println!("[Haysu] Hotkey: Toggle DND");
                }
            }
        },
    )?;

    println!("[Haysu] Global hotkeys registered: Ctrl+Shift+J (Pomodoro), Ctrl+Shift+K (DND)");
    Ok(())
}

/// Unregister all global hotkeys (call on app exit)
pub fn unregister_hotkeys(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    app.global_shortcut().unregister_all()?;
    println!("[Haysu] Global hotkeys unregistered");
    Ok(())
}
