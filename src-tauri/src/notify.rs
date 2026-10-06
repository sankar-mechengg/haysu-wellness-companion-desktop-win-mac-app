//! Native OS notifications.

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

pub fn native(app: &AppHandle, title: &str, body: &str) {
    if let Err(e) = app.notification().builder().title(title).body(body).show() {
        log::warn!("native notification failed: {e}");
    }
}
