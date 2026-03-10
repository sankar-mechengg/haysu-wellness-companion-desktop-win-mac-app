use std::fs;
use tauri::State;
use crate::db::init::DbState;
use crate::db::models::{WaterEntry, MovementEntry, PomodoroEntry};

#[derive(serde::Serialize)]
pub struct ExportData {
    pub water_log: Vec<WaterEntry>,
    pub movement_log: Vec<MovementEntry>,
    pub pomodoro_log: Vec<PomodoroEntry>,
    pub exported_at: String,
}

#[tauri::command]
pub fn export_json(db: State<'_, DbState>, file_path: String) -> Result<String, String> {
    let data = gather_export_data(&db)?;
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&file_path, &json).map_err(|e| e.to_string())?;
    Ok(file_path)
}

#[tauri::command]
pub fn export_csv(db: State<'_, DbState>, folder_path: String) -> Result<Vec<String>, String> {
    let data = gather_export_data(&db)?;
    let mut files = Vec::new();

    // Water log CSV
    let water_path = format!("{}/haysu_water_log.csv", folder_path);
    let mut water_csv = String::from("id,timestamp,consumed,amount_ml\n");
    for entry in &data.water_log {
        water_csv.push_str(&format!(
            "{},{},{},{}\n",
            entry.id, entry.timestamp, entry.consumed, entry.amount_ml
        ));
    }
    fs::write(&water_path, &water_csv).map_err(|e| e.to_string())?;
    files.push(water_path);

    // Movement log CSV
    let move_path = format!("{}/haysu_movement_log.csv", folder_path);
    let mut move_csv = String::from("id,timestamp,exercise_id,exercise_name,category,completed\n");
    for entry in &data.movement_log {
        move_csv.push_str(&format!(
            "{},{},{},{},{},{}\n",
            entry.id, entry.timestamp, entry.exercise_id, entry.exercise_name, entry.category, entry.completed
        ));
    }
    fs::write(&move_path, &move_csv).map_err(|e| e.to_string())?;
    files.push(move_path);

    // Pomodoro log CSV
    let pomo_path = format!("{}/haysu_pomodoro_log.csv", folder_path);
    let mut pomo_csv = String::from("id,started_at,ended_at,session_type,completed\n");
    for entry in &data.pomodoro_log {
        pomo_csv.push_str(&format!(
            "{},{},{},{},{}\n",
            entry.id,
            entry.started_at,
            entry.ended_at.as_deref().unwrap_or(""),
            entry.session_type,
            entry.completed
        ));
    }
    fs::write(&pomo_path, &pomo_csv).map_err(|e| e.to_string())?;
    files.push(pomo_path);

    Ok(files)
}

fn gather_export_data(db: &State<'_, DbState>) -> Result<ExportData, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Water log
    let mut stmt = conn
        .prepare("SELECT id, timestamp, consumed, amount_ml FROM water_log ORDER BY timestamp")
        .map_err(|e| e.to_string())?;
    let water_log: Vec<WaterEntry> = stmt
        .query_map([], |row| {
            Ok(WaterEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                consumed: row.get::<_, i32>(2)? == 1,
                amount_ml: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Movement log
    let mut stmt = conn
        .prepare("SELECT id, timestamp, exercise_id, exercise_name, category, completed FROM movement_log ORDER BY timestamp")
        .map_err(|e| e.to_string())?;
    let movement_log: Vec<MovementEntry> = stmt
        .query_map([], |row| {
            Ok(MovementEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                exercise_id: row.get(2)?,
                exercise_name: row.get(3)?,
                category: row.get(4)?,
                completed: row.get::<_, i32>(5)? == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Pomodoro log
    let mut stmt = conn
        .prepare("SELECT id, started_at, ended_at, session_type, completed FROM pomodoro_log ORDER BY started_at")
        .map_err(|e| e.to_string())?;
    let pomodoro_log: Vec<PomodoroEntry> = stmt
        .query_map([], |row| {
            Ok(PomodoroEntry {
                id: row.get(0)?,
                started_at: row.get(1)?,
                ended_at: row.get(2)?,
                session_type: row.get(3)?,
                completed: row.get::<_, i32>(4)? == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ExportData {
        water_log,
        movement_log,
        pomodoro_log,
        exported_at: chrono::Local::now().to_rfc3339(),
    })
}
