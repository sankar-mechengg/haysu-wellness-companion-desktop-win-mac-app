use tauri::State;
use crate::db::init::DbState;
use crate::db::models::{DailyStats, WaterEntry, MovementEntry, PomodoroEntry};

// ─── Water Logging ───

#[tauri::command]
pub fn log_water(db: State<'_, DbState>, consumed: bool, amount_ml: i64) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO water_log (consumed, amount_ml) VALUES (?1, ?2)",
        rusqlite::params![consumed as i32, amount_ml],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_water_today(db: State<'_, DbState>) -> Result<Vec<WaterEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, timestamp, consumed, amount_ml FROM water_log
             WHERE date(timestamp) = date('now', 'localtime')
             ORDER BY timestamp DESC",
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
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

    Ok(entries)
}

// ─── Movement Logging ───

#[tauri::command]
pub fn log_movement(
    db: State<'_, DbState>,
    exercise_id: String,
    exercise_name: String,
    category: String,
    completed: bool,
) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO movement_log (exercise_id, exercise_name, category, completed) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![exercise_id, exercise_name, category, completed as i32],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_movement_today(db: State<'_, DbState>) -> Result<Vec<MovementEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, timestamp, exercise_id, exercise_name, category, completed FROM movement_log
             WHERE date(timestamp) = date('now', 'localtime')
             ORDER BY timestamp DESC",
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
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

    Ok(entries)
}

// ─── Pomodoro Logging ───

#[tauri::command]
pub fn log_pomodoro_start(db: State<'_, DbState>, session_type: String) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO pomodoro_log (session_type, completed) VALUES (?1, 0)",
        rusqlite::params![session_type],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn log_pomodoro_end(db: State<'_, DbState>, id: i64, completed: bool) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE pomodoro_log SET ended_at = CURRENT_TIMESTAMP, completed = ?1 WHERE id = ?2",
        rusqlite::params![completed as i32, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_pomodoro_today(db: State<'_, DbState>) -> Result<Vec<PomodoroEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, started_at, ended_at, session_type, completed FROM pomodoro_log
             WHERE date(started_at) = date('now', 'localtime')
             ORDER BY started_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
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

    Ok(entries)
}

// ─── Aggregated Stats ───

#[tauri::command]
pub fn get_daily_stats(db: State<'_, DbState>, date: String) -> Result<DailyStats, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let water_consumed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM water_log WHERE date(timestamp) = ?1 AND consumed = 1",
            rusqlite::params![date],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let water_skipped: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM water_log WHERE date(timestamp) = ?1 AND consumed = 0",
            rusqlite::params![date],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let water_total_ml: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount_ml), 0) FROM water_log WHERE date(timestamp) = ?1 AND consumed = 1",
            rusqlite::params![date],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let water_goal_ml: i64 = conn
        .query_row(
            "SELECT COALESCE(daily_water_ml, 2450) FROM user_profile WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(2450);

    let movement_completed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM movement_log WHERE date(timestamp) = ?1 AND completed = 1",
            rusqlite::params![date],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let movement_skipped: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM movement_log WHERE date(timestamp) = ?1 AND completed = 0",
            rusqlite::params![date],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let pomodoro_work_completed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pomodoro_log WHERE date(started_at) = ?1 AND session_type = 'work' AND completed = 1",
            rusqlite::params![date],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let pomodoro_total_minutes: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(CAST((julianday(ended_at) - julianday(started_at)) * 1440 AS INTEGER)), 0)
             FROM pomodoro_log WHERE date(started_at) = ?1 AND session_type = 'work' AND completed = 1",
            rusqlite::params![date],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(DailyStats {
        date,
        water_consumed,
        water_skipped,
        water_total_ml,
        water_goal_ml,
        movement_completed,
        movement_skipped,
        pomodoro_work_completed,
        pomodoro_total_minutes,
    })
}

#[tauri::command]
pub fn get_weekly_stats(db: State<'_, DbState>, start_date: String) -> Result<Vec<DailyStats>, String> {
    let mut days = Vec::new();
    for i in 0..7 {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let date: String = conn
            .query_row(
                "SELECT date(?1, '+' || ?2 || ' days')",
                rusqlite::params![start_date, i],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        drop(conn);
        let stats = get_daily_stats(db.clone(), date)?;
        days.push(stats);
    }
    Ok(days)
}
