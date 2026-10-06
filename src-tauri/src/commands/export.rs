//! Data export (JSON and CSV).

use std::fs;
use std::path::{Path, PathBuf};

use tauri::State;

use crate::db::models::{MovementEntry, PomodoroEntry, WaterEntry};
use crate::db::{time, DbState};

#[derive(serde::Serialize)]
pub struct ExportData {
    pub app_version: &'static str,
    pub exported_at: String,
    pub water_log: Vec<WaterEntry>,
    pub movement_log: Vec<MovementEntry>,
    pub pomodoro_log: Vec<PomodoroEntry>,
}

#[tauri::command]
pub fn export_json(db: State<'_, DbState>, file_path: String) -> Result<String, String> {
    let data = gather(&db)?;
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    let path = ensure_extension(PathBuf::from(file_path), "json");
    fs::write(&path, json).map_err(|e| format!("cannot write {}: {e}", path.display()))?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn export_csv(db: State<'_, DbState>, folder_path: String) -> Result<Vec<String>, String> {
    let data = gather(&db)?;
    let folder = Path::new(&folder_path);
    fs::create_dir_all(folder).map_err(|e| format!("cannot create {}: {e}", folder.display()))?;
    let stamp = time::today_local();

    let mut files = Vec::new();

    let mut csv = String::from("id,timestamp,consumed,amount_ml\n");
    for e in &data.water_log {
        csv.push_str(&csv_row(&[
            &e.id.to_string(),
            &e.timestamp,
            &e.consumed.to_string(),
            &e.amount_ml.to_string(),
        ]));
    }
    files.push(write_csv(
        folder,
        &format!("haysu_water_{stamp}.csv"),
        &csv,
    )?);

    let mut csv = String::from("id,timestamp,exercise_id,exercise_name,category,completed\n");
    for e in &data.movement_log {
        csv.push_str(&csv_row(&[
            &e.id.to_string(),
            &e.timestamp,
            &e.exercise_id,
            &e.exercise_name,
            &e.category,
            &e.completed.to_string(),
        ]));
    }
    files.push(write_csv(
        folder,
        &format!("haysu_movement_{stamp}.csv"),
        &csv,
    )?);

    let mut csv = String::from("id,started_at,ended_at,session_type,completed\n");
    for e in &data.pomodoro_log {
        csv.push_str(&csv_row(&[
            &e.id.to_string(),
            &e.started_at,
            e.ended_at.as_deref().unwrap_or(""),
            &e.session_type,
            &e.completed.to_string(),
        ]));
    }
    files.push(write_csv(
        folder,
        &format!("haysu_pomodoro_{stamp}.csv"),
        &csv,
    )?);

    Ok(files)
}

fn write_csv(folder: &Path, name: &str, content: &str) -> Result<String, String> {
    let path = folder.join(name);
    fs::write(&path, content).map_err(|e| format!("cannot write {}: {e}", path.display()))?;
    Ok(path.to_string_lossy().into_owned())
}

fn ensure_extension(mut path: PathBuf, ext: &str) -> PathBuf {
    if path.extension().map(|e| e != ext).unwrap_or(true) {
        path.set_extension(ext);
    }
    path
}

/// RFC 4180 escaping: quote when a field has a comma, quote, or newline.
pub fn csv_field(s: &str) -> String {
    if s.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

pub fn csv_row(fields: &[&str]) -> String {
    let mut row = fields
        .iter()
        .map(|f| csv_field(f))
        .collect::<Vec<_>>()
        .join(",");
    row.push('\n');
    row
}

fn gather(db: &State<'_, DbState>) -> Result<ExportData, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, timestamp, consumed, amount_ml FROM water_log ORDER BY timestamp")
        .map_err(|e| e.to_string())?;
    let water_log = stmt
        .query_map([], |row| {
            Ok(WaterEntry {
                id: row.get(0)?,
                timestamp: time::to_rfc3339(&row.get::<_, String>(1)?),
                consumed: row.get::<_, i32>(2)? == 1,
                amount_ml: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let mut stmt = conn
        .prepare("SELECT id, timestamp, exercise_id, exercise_name, category, completed FROM movement_log ORDER BY timestamp")
        .map_err(|e| e.to_string())?;
    let movement_log = stmt
        .query_map([], |row| {
            Ok(MovementEntry {
                id: row.get(0)?,
                timestamp: time::to_rfc3339(&row.get::<_, String>(1)?),
                exercise_id: row.get(2)?,
                exercise_name: row.get(3)?,
                category: row.get(4)?,
                completed: row.get::<_, i32>(5)? == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let mut stmt = conn
        .prepare("SELECT id, started_at, ended_at, session_type, completed FROM pomodoro_log ORDER BY started_at")
        .map_err(|e| e.to_string())?;
    let pomodoro_log = stmt
        .query_map([], |row| {
            Ok(PomodoroEntry {
                id: row.get(0)?,
                started_at: time::to_rfc3339(&row.get::<_, String>(1)?),
                ended_at: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| time::to_rfc3339(&s)),
                session_type: row.get(3)?,
                completed: row.get::<_, i32>(4)? == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(ExportData {
        app_version: env!("CARGO_PKG_VERSION"),
        exported_at: chrono::Utc::now().to_rfc3339(),
        water_log,
        movement_log,
        pomodoro_log,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_special_characters() {
        assert_eq!(csv_field("plain"), "plain");
        assert_eq!(csv_field("a,b"), "\"a,b\"");
        assert_eq!(csv_field("say \"hi\""), "\"say \"\"hi\"\"\"");
        assert_eq!(csv_row(&["1", "x,y"]), "1,\"x,y\"\n");
    }

    #[test]
    fn adds_missing_extension() {
        assert_eq!(
            ensure_extension(PathBuf::from("out"), "json"),
            PathBuf::from("out.json")
        );
        assert_eq!(
            ensure_extension(PathBuf::from("out.json"), "json"),
            PathBuf::from("out.json")
        );
    }
}
