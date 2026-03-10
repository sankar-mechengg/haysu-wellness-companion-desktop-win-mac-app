use std::collections::HashMap;
use tauri::State;
use crate::db::init::DbState;

#[tauri::command]
pub fn get_setting(db: State<'_, DbState>, key: String) -> Result<Option<String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let value = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![key],
            |row| row.get::<_, String>(0),
        )
        .ok();
    Ok(value)
}

#[tauri::command]
pub fn set_setting(db: State<'_, DbState>, key: String, value: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_all_settings(db: State<'_, DbState>) -> Result<HashMap<String, String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut map = HashMap::new();
    for row in rows {
        if let Ok((k, v)) = row {
            map.insert(k, v);
        }
    }
    Ok(map)
}

#[tauri::command]
pub fn set_multiple_settings(
    db: State<'_, DbState>,
    settings: HashMap<String, String>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    for (key, value) in settings {
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?2",
            rusqlite::params![key, value],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
