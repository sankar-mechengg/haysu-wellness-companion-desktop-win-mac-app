//! Backup, snapshot, import and report commands.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::backup::{self, Archive, ImportReport};
use crate::db::DbState;
use crate::scheduler;

/// A file the OS asked us to open (double-click on a .hay/.su).
pub struct PendingImport(pub Mutex<Option<PathBuf>>);

pub const EV_IMPORT_FILE: &str = "import-file";

fn with_conn<T>(
    app: &AppHandle,
    f: impl FnOnce(&rusqlite::Connection) -> Result<T, String>,
) -> Result<T, String> {
    let db = app.state::<DbState>();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    f(&conn)
}

fn ensure_ext(path: &str, ext: &str) -> PathBuf {
    let mut p = PathBuf::from(path);
    if p.extension().map(|x| x != ext).unwrap_or(true) {
        p.set_extension(ext);
    }
    p
}

#[tauri::command]
pub fn backup_export_hay(
    app: AppHandle,
    path: String,
    include_ai: Option<bool>,
) -> Result<String, String> {
    let archive = with_conn(&app, |c| {
        backup::gather(c, true, include_ai.unwrap_or(true))
    })?;
    backup::write(&archive, &ensure_ext(&path, "hay"))
}

#[tauri::command]
pub fn backup_export_su(app: AppHandle, path: String) -> Result<String, String> {
    let archive = with_conn(&app, |c| backup::gather(c, false, false))?;
    backup::write(&archive, &ensure_ext(&path, "su"))
}

#[derive(Debug, Clone, Serialize)]
pub struct ArchivePreview {
    pub format: String,
    pub app_version: String,
    pub created_at: String,
    pub exported_by: String,
    pub has_profile: bool,
    pub counts: Vec<(String, usize)>,
}

/// Inspect a file before importing it.
#[tauri::command]
pub fn backup_preview(path: String) -> Result<ArchivePreview, String> {
    let a: Archive = backup::read(Path::new(&path))?;
    Ok(ArchivePreview {
        format: a.format.clone(),
        app_version: a.app_version.clone(),
        created_at: a.created_at.clone(),
        exported_by: a.exported_by.clone(),
        has_profile: a.profile.is_some(),
        counts: vec![
            ("settings".into(), a.settings.len()),
            ("water".into(), a.water_log.len()),
            ("movement".into(), a.movement_log.len()),
            ("pomodoro".into(), a.pomodoro_log.len()),
            ("medicines".into(), a.medicines.len()),
            ("doses".into(), a.dose_log.len()),
            ("conditions".into(), a.conditions.len()),
            ("diary".into(), a.diary.len()),
            ("measurements".into(), a.measurements.len()),
            ("food".into(), a.food_log.len()),
            ("care_routines".into(), a.care_routines.len()),
            ("ai_conversations".into(), a.ai_conversations.len()),
        ],
    })
}

#[tauri::command]
pub async fn backup_import(
    app: AppHandle,
    path: String,
    replace: bool,
) -> Result<ImportReport, String> {
    let a = backup::read(Path::new(&path))?;
    // Snapshots never replace.
    let replace = replace && a.format == backup::HAY_FORMAT;
    let report = with_conn(&app, |c| backup::import(c, &a, replace))?;
    // Reload everything that caches DB state.
    let cfg = {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        crate::config::AppConfig::load(&conn)
    };
    crate::commands::config::commit_config(&app, cfg);
    scheduler::reload_medicines(&app);
    scheduler::reload_care(&app);
    if let Ok(Some(p)) = crate::commands::user::get_user_profile(app.state::<DbState>()) {
        let _ = app.emit(crate::commands::user::EV_PROFILE, &p);
    }
    let _ = app.emit(crate::commands::stats::EV_ACTIVITY, "import");
    let _ = app.emit(crate::commands::health::EV_HEALTH, "import");
    let _ = app.emit(crate::commands::care::EV_CARE, ());
    let _ = app.emit(crate::commands::ai::EV_HISTORY, ());
    Ok(report)
}

#[tauri::command]
pub fn backup_list(app: AppHandle) -> Vec<(String, u64)> {
    app.path()
        .app_data_dir()
        .map(|d| backup::list_backups(&d))
        .unwrap_or_default()
}

#[tauri::command]
pub fn backup_now(app: AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let archive = with_conn(&app, |c| backup::gather(c, true, true))?;
    let path = backup::backups_dir(&dir).join(format!(
        "haysu-{}-manual.hay",
        chrono::Local::now().format("%Y-%m-%d-%H%M%S")
    ));
    backup::write(&archive, &path)
}

#[tauri::command]
pub fn backup_health_report(app: AppHandle) -> Result<String, String> {
    with_conn(&app, backup::health_report)
}

#[tauri::command]
pub fn backup_save_report(app: AppHandle, path: String) -> Result<String, String> {
    let md = with_conn(&app, backup::health_report)?;
    let p = ensure_ext(&path, "md");
    std::fs::write(&p, md).map_err(|e| e.to_string())?;
    Ok(p.to_string_lossy().into_owned())
}

/// Path handed to us by the OS, if any (consumed on read).
#[tauri::command]
pub fn backup_take_pending_import(app: AppHandle) -> Option<String> {
    app.state::<PendingImport>()
        .0
        .lock()
        .ok()
        .and_then(|mut p| p.take())
        .map(|p| p.to_string_lossy().into_owned())
}

/// Called from startup / single-instance / macOS open events.
pub fn queue_import(app: &AppHandle, path: PathBuf) {
    let ok = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("hay") || e.eq_ignore_ascii_case("su"))
        .unwrap_or(false);
    if !ok || !path.exists() {
        return;
    }
    log::info!("import requested: {}", path.display());
    if let Ok(mut p) = app.state::<PendingImport>().0.lock() {
        *p = Some(path.clone());
    }
    crate::windows::ensure_window(app, crate::windows::DASHBOARD);
    let _ = app.emit(EV_IMPORT_FILE, path.to_string_lossy().into_owned());
}
