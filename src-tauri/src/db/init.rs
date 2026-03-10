use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::Connection;
use tauri::AppHandle;
use tauri::Manager;

/// Managed database state
pub struct DbState {
    pub conn: Mutex<Connection>,
}

/// Get the database file path in the app data directory
pub fn get_db_path(app: &AppHandle) -> PathBuf {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    app_dir.join("haysu.db")
}

/// Initialize the database and run migrations
pub fn initialize_db(app: &AppHandle) -> DbState {
    let db_path = get_db_path(app);
    let conn = Connection::open(&db_path).expect("Failed to open database");

    // Enable WAL mode for better concurrent access
    conn.execute_batch("PRAGMA journal_mode=WAL;")
        .expect("Failed to set WAL mode");

    // Run table creation
    conn.execute_batch(CREATE_TABLES_SQL)
        .expect("Failed to create tables");

    // Seed default settings if empty
    seed_default_settings(&conn);

    DbState {
        conn: Mutex::new(conn),
    }
}

fn seed_default_settings(conn: &Connection) {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM settings", [], |row| row.get(0))
        .unwrap_or(0);

    if count == 0 {
        let defaults = vec![
            ("water_interval_min", "30"),
            ("movement_interval_min", "45"),
            ("pomodoro_work_min", "25"),
            ("pomodoro_short_break_min", "5"),
            ("pomodoro_long_break_min", "15"),
            ("pomodoro_sessions_before_long", "4"),
            ("sound_enabled", "true"),
            ("dnd_enabled", "false"),
            ("theme", "light"),
            ("widget_always_on_top", "true"),
            ("widget_visible", "true"),
            ("autostart_enabled", "false"),
            ("onboarding_complete", "false"),
            ("water_amount_ml", "250"),
        ];
        for (key, value) in defaults {
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
                rusqlite::params![key, value],
            )
            .ok();
        }
    }
}

const CREATE_TABLES_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS user_profile (
    id          INTEGER PRIMARY KEY DEFAULT 1,
    name        TEXT NOT NULL DEFAULT '',
    age         INTEGER DEFAULT 0,
    weight_kg   REAL DEFAULT 70.0,
    height_cm   REAL DEFAULT 170.0,
    occupation  TEXT DEFAULT '',
    work_style  TEXT DEFAULT 'sedentary' CHECK(work_style IN ('sedentary','moderate','active')),
    daily_water_ml INTEGER DEFAULT 2450,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS water_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
    consumed    INTEGER DEFAULT 1,
    amount_ml   INTEGER DEFAULT 250
);

CREATE TABLE IF NOT EXISTS movement_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
    exercise_id   TEXT DEFAULT '',
    exercise_name TEXT DEFAULT '',
    category      TEXT DEFAULT '',
    completed     INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pomodoro_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at        DATETIME,
    session_type    TEXT DEFAULT 'work' CHECK(session_type IN ('work','short_break','long_break')),
    completed       INTEGER DEFAULT 0
);
"#;
