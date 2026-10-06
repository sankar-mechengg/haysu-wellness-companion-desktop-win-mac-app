//! Database bootstrap and migrations.

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

/// Managed database state.
pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    /// Open (or create) the database at `path` and run migrations.
    pub fn open(path: &std::path::Path) -> Result<Self, String> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("cannot create data dir {}: {e}", parent.display()))?;
        }
        let conn = Connection::open(path).map_err(|e| format!("cannot open database: {e}"))?;
        prepare(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// In-memory database, used by tests.
    #[cfg(test)]
    pub fn in_memory() -> Self {
        let conn = Connection::open_in_memory().expect("in-memory sqlite");
        prepare(&conn).expect("migrations");
        Self {
            conn: Mutex::new(conn),
        }
    }
}

fn prepare(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA foreign_keys=ON;
         PRAGMA busy_timeout=5000;",
    )
    .map_err(|e| format!("pragma failed: {e}"))?;
    migrate(conn)
}

/// Resolve the database path inside the app data directory.
pub fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no app data dir: {e}"))?;
    Ok(dir.join("haysu.db"))
}

/// Current schema version. Bump when adding a migration.
pub const SCHEMA_VERSION: i64 = 3;

fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER NOT NULL
        );",
    )
    .map_err(|e| e.to_string())?;

    let current: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    // Version 0 => brand new or a 1.0.x database that predates versioning.
    if current < 1 {
        conn.execute_batch(V1_SQL)
            .map_err(|e| format!("migration v1: {e}"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (1)", [])
            .map_err(|e| e.to_string())?;
    }
    if current < 2 {
        conn.execute_batch(V2_SQL)
            .map_err(|e| format!("migration v2: {e}"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (2)", [])
            .map_err(|e| e.to_string())?;
    }
    if current < 3 {
        conn.execute_batch(V3_SQL)
            .map_err(|e| format!("migration v3: {e}"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (3)", [])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Original 1.0 schema. `IF NOT EXISTS` keeps existing databases intact.
const V1_SQL: &str = r#"
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

/// 1.1: indexes for date-range queries.
const V2_SQL: &str = r#"
CREATE INDEX IF NOT EXISTS idx_water_ts ON water_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_movement_ts ON movement_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_pomodoro_started ON pomodoro_log(started_at);
"#;

/// 1.2: medicines, dose log, conditions, diary, measurements.
const V3_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS medicines (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    dose          TEXT NOT NULL DEFAULT '',
    instructions  TEXT NOT NULL DEFAULT '',
    times         TEXT NOT NULL DEFAULT '[]',
    days          TEXT NOT NULL DEFAULT '[1,2,3,4,5,6,7]',
    active        INTEGER NOT NULL DEFAULT 1,
    start_date    TEXT,
    end_date      TEXT,
    color         TEXT NOT NULL DEFAULT '#3b93f7',
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dose_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id   INTEGER NOT NULL,
    scheduled_at  TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','snoozed','taken','skipped','missed')),
    taken_at      TEXT,
    snoozed_until TEXT,
    note          TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(medicine_id, scheduled_at)
);
CREATE INDEX IF NOT EXISTS idx_dose_sched ON dose_log(scheduled_at);

CREATE TABLE IF NOT EXISTS conditions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    notes       TEXT NOT NULL DEFAULT '',
    severity    INTEGER NOT NULL DEFAULT 2,
    status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','resolved')),
    started_on  TEXT,
    resolved_on TEXT,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diary_entries (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp    TEXT NOT NULL,
    mood         INTEGER,
    energy       INTEGER,
    sleep_hours  REAL,
    pain         INTEGER,
    symptoms     TEXT NOT NULL DEFAULT '[]',
    notes        TEXT NOT NULL DEFAULT '',
    condition_id INTEGER,
    created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_diary_ts ON diary_entries(timestamp);

CREATE TABLE IF NOT EXISTS measurements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kind        TEXT NOT NULL,
    value       REAL NOT NULL,
    value2      REAL,
    unit        TEXT NOT NULL DEFAULT '',
    measured_at TEXT NOT NULL,
    notes       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_meas_kind_ts ON measurements(kind, measured_at);
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fresh_db_is_at_latest_version() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let v: i64 = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(v, SCHEMA_VERSION);
    }

    #[test]
    fn migration_is_idempotent() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        migrate(&conn).unwrap();
        migrate(&conn).unwrap();
        let rows: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(rows, SCHEMA_VERSION);
    }

    #[test]
    fn upgrades_a_1_0_database() {
        // Simulate a 1.0 database: tables exist but no schema_version table.
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(V1_SQL).unwrap();
        conn.execute(
            "INSERT INTO water_log (consumed, amount_ml) VALUES (1, 250)",
            [],
        )
        .unwrap();
        prepare(&conn).unwrap();
        let v: i64 = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(v, SCHEMA_VERSION);
        let rows: i64 = conn
            .query_row("SELECT COUNT(*) FROM water_log", [], |r| r.get(0))
            .unwrap();
        assert_eq!(rows, 1, "existing data must survive");
    }
}
