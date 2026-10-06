//! Activity logging and aggregation. Every date comparison converts the stored
//! UTC timestamp to local time first (`date(ts, 'localtime')`).

use std::collections::HashSet;

use chrono::NaiveDate;
use rusqlite::Connection;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::config::ConfigState;
use crate::db::models::{DailyStats, MovementEntry, PomodoroEntry, Streaks, WaterEntry};
use crate::db::{time, DbState};

pub const EV_ACTIVITY: &str = "activity-logged";

fn require_date(date: &str) -> Result<(), String> {
    if time::is_valid_date(date) {
        Ok(())
    } else {
        Err(format!("invalid date: {date}"))
    }
}

// ─── Water ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn log_water(app: AppHandle, consumed: bool, amount_ml: i64) -> Result<i64, String> {
    let amount = if consumed {
        amount_ml.clamp(0, 5000)
    } else {
        0
    };
    let id = {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO water_log (timestamp, consumed, amount_ml) VALUES (?1, ?2, ?3)",
            rusqlite::params![time::now_utc(), consumed as i32, amount],
        )
        .map_err(|e| e.to_string())?;
        conn.last_insert_rowid()
    };
    let _ = app.emit(EV_ACTIVITY, "water");
    Ok(id)
}

/// Log one glass using the configured amount (tray / hotkey).
pub fn quick_log_water(app: &AppHandle) {
    let amount = app.state::<ConfigState>().get().water_amount_ml as i64;
    match log_water(app.clone(), true, amount) {
        Ok(_) => crate::notify::native(app, "Haysu", &format!("Logged {amount} ml of water")),
        Err(e) => log::warn!("quick water log failed: {e}"),
    }
}

#[tauri::command]
pub fn get_water_today(db: State<'_, DbState>) -> Result<Vec<WaterEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    water_for_date(&conn, &time::today_local())
}

fn water_for_date(conn: &Connection, date: &str) -> Result<Vec<WaterEntry>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, timestamp, consumed, amount_ml FROM water_log
             WHERE date(timestamp, 'localtime') = ?1 ORDER BY timestamp DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([date], |row| {
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
    Ok(rows)
}

// ─── Movement ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn log_movement(
    app: AppHandle,
    exercise_id: String,
    exercise_name: String,
    category: String,
    completed: bool,
) -> Result<i64, String> {
    let id = {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO movement_log (timestamp, exercise_id, exercise_name, category, completed)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                time::now_utc(),
                exercise_id,
                exercise_name,
                category,
                completed as i32
            ],
        )
        .map_err(|e| e.to_string())?;
        conn.last_insert_rowid()
    };
    let _ = app.emit(EV_ACTIVITY, "movement");
    Ok(id)
}

#[tauri::command]
pub fn get_movement_today(db: State<'_, DbState>) -> Result<Vec<MovementEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, timestamp, exercise_id, exercise_name, category, completed FROM movement_log
             WHERE date(timestamp, 'localtime') = ?1 ORDER BY timestamp DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([time::today_local()], |row| {
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
    Ok(rows)
}

// ─── Pomodoro ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_pomodoro_today(db: State<'_, DbState>) -> Result<Vec<PomodoroEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, started_at, ended_at, session_type, completed FROM pomodoro_log
             WHERE date(started_at, 'localtime') = ?1 ORDER BY started_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([time::today_local()], |row| {
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
    Ok(rows)
}

/// Remove a wrongly logged entry.
#[tauri::command]
pub fn delete_entry(app: AppHandle, kind: String, id: i64) -> Result<(), String> {
    let table = match kind.as_str() {
        "water" => "water_log",
        "movement" => "movement_log",
        "pomodoro" => "pomodoro_log",
        _ => return Err("unknown kind".into()),
    };
    {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(&format!("DELETE FROM {table} WHERE id = ?1"), [id])
            .map_err(|e| e.to_string())?;
    }
    let _ = app.emit(EV_ACTIVITY, kind);
    Ok(())
}

// ─── Aggregates ────────────────────────────────────────────────────────────

fn count(conn: &Connection, sql: &str, date: &str) -> i64 {
    conn.query_row(sql, [date], |r| r.get(0)).unwrap_or(0)
}

pub fn daily_stats(conn: &Connection, date: &str) -> DailyStats {
    let water_goal_ml: i64 = conn
        .query_row(
            "SELECT COALESCE(daily_water_ml, 2450) FROM user_profile WHERE id = 1",
            [],
            |r| r.get(0),
        )
        .unwrap_or(2450);

    DailyStats {
        date: date.to_string(),
        water_consumed: count(
            conn,
            "SELECT COUNT(*) FROM water_log WHERE date(timestamp,'localtime') = ?1 AND consumed = 1",
            date,
        ),
        water_skipped: count(
            conn,
            "SELECT COUNT(*) FROM water_log WHERE date(timestamp,'localtime') = ?1 AND consumed = 0",
            date,
        ),
        water_total_ml: count(
            conn,
            "SELECT COALESCE(SUM(amount_ml),0) FROM water_log WHERE date(timestamp,'localtime') = ?1 AND consumed = 1",
            date,
        ),
        water_goal_ml,
        movement_completed: count(
            conn,
            "SELECT COUNT(*) FROM movement_log WHERE date(timestamp,'localtime') = ?1 AND completed = 1",
            date,
        ),
        movement_skipped: count(
            conn,
            "SELECT COUNT(*) FROM movement_log WHERE date(timestamp,'localtime') = ?1 AND completed = 0",
            date,
        ),
        pomodoro_work_completed: count(
            conn,
            "SELECT COUNT(*) FROM pomodoro_log WHERE date(started_at,'localtime') = ?1
             AND session_type = 'work' AND completed = 1",
            date,
        ),
        pomodoro_total_minutes: count(
            conn,
            "SELECT COALESCE(SUM(CAST(ROUND((julianday(ended_at) - julianday(started_at)) * 1440) AS INTEGER)), 0)
             FROM pomodoro_log WHERE date(started_at,'localtime') = ?1
             AND session_type = 'work' AND completed = 1 AND ended_at IS NOT NULL",
            date,
        ),
    }
}

#[tauri::command]
pub fn get_today_date() -> String {
    time::today_local()
}

#[tauri::command]
pub fn get_daily_stats(db: State<'_, DbState>, date: String) -> Result<DailyStats, String> {
    require_date(&date)?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    Ok(daily_stats(&conn, &date))
}

#[tauri::command]
pub fn get_weekly_stats(
    db: State<'_, DbState>,
    start_date: String,
) -> Result<Vec<DailyStats>, String> {
    require_date(&start_date)?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    Ok((0..7)
        .map(|i| daily_stats(&conn, &time::add_days(&start_date, i)))
        .collect())
}

// ─── Streaks ───────────────────────────────────────────────────────────────

/// Pure streak computation over a set of active dates.
pub fn compute_streaks(
    active: &HashSet<NaiveDate>,
    water_ok: &HashSet<NaiveDate>,
    today: NaiveDate,
) -> Streaks {
    let run_ending_at = |set: &HashSet<NaiveDate>, mut day: NaiveDate| -> i64 {
        let mut n = 0;
        while set.contains(&day) {
            n += 1;
            day -= chrono::Duration::days(1);
        }
        n
    };
    let today_active = active.contains(&today);
    let anchor = if today_active {
        today
    } else {
        today - chrono::Duration::days(1)
    };
    let current_streak = run_ending_at(active, anchor);

    let water_anchor = if water_ok.contains(&today) {
        today
    } else {
        today - chrono::Duration::days(1)
    };
    let water_goal_streak = run_ending_at(water_ok, water_anchor);

    // Longest streak: scan sorted dates.
    let mut sorted: Vec<&NaiveDate> = active.iter().collect();
    sorted.sort();
    let mut longest = 0;
    let mut run = 0;
    let mut prev: Option<NaiveDate> = None;
    for d in sorted {
        run = match prev {
            Some(p) if *d - p == chrono::Duration::days(1) => run + 1,
            _ => 1,
        };
        longest = longest.max(run);
        prev = Some(*d);
    }

    let cutoff = today - chrono::Duration::days(29);
    let active_days_30 = active
        .iter()
        .filter(|d| **d >= cutoff && **d <= today)
        .count() as i64;

    Streaks {
        current_streak,
        longest_streak: longest,
        active_days_30,
        water_goal_streak,
        today_active,
    }
}

#[tauri::command]
pub fn get_streaks(db: State<'_, DbState>) -> Result<Streaks, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut active = HashSet::new();
    let mut stmt = conn
        .prepare(
            "SELECT d FROM (
                SELECT date(timestamp,'localtime') AS d FROM water_log WHERE consumed = 1
                UNION SELECT date(timestamp,'localtime') FROM movement_log WHERE completed = 1
                UNION SELECT date(started_at,'localtime') FROM pomodoro_log
                       WHERE completed = 1 AND session_type = 'work'
                UNION SELECT date(timestamp,'localtime') FROM diary_entries
                UNION SELECT substr(scheduled_at,1,10) FROM dose_log WHERE status = 'taken'
             ) WHERE d IS NOT NULL",
        )
        .map_err(|e| e.to_string())?;
    for d in stmt
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .flatten()
    {
        if let Ok(nd) = NaiveDate::parse_from_str(&d, "%Y-%m-%d") {
            active.insert(nd);
        }
    }

    let goal: i64 = conn
        .query_row(
            "SELECT COALESCE(daily_water_ml, 2450) FROM user_profile WHERE id = 1",
            [],
            |r| r.get(0),
        )
        .unwrap_or(2450);
    let mut water_ok = HashSet::new();
    let mut stmt = conn
        .prepare(
            "SELECT date(timestamp,'localtime') AS d, SUM(amount_ml) FROM water_log
             WHERE consumed = 1 GROUP BY d HAVING SUM(amount_ml) >= ?1",
        )
        .map_err(|e| e.to_string())?;
    for d in stmt
        .query_map([goal], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .flatten()
    {
        if let Ok(nd) = NaiveDate::parse_from_str(&d, "%Y-%m-%d") {
            water_ok.insert(nd);
        }
    }

    let today =
        NaiveDate::parse_from_str(&time::today_local(), "%Y-%m-%d").map_err(|e| e.to_string())?;
    Ok(compute_streaks(&active, &water_ok, today))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn d(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    #[test]
    fn streak_counts_back_from_today() {
        let active: HashSet<_> = ["2026-03-09", "2026-03-10", "2026-03-11"]
            .iter()
            .map(|s| d(s))
            .collect();
        let s = compute_streaks(&active, &HashSet::new(), d("2026-03-11"));
        assert_eq!(s.current_streak, 3);
        assert_eq!(s.longest_streak, 3);
        assert!(s.today_active);
    }

    #[test]
    fn streak_survives_an_empty_today() {
        let active: HashSet<_> = ["2026-03-09", "2026-03-10"].iter().map(|s| d(s)).collect();
        let s = compute_streaks(&active, &HashSet::new(), d("2026-03-11"));
        assert_eq!(s.current_streak, 2);
        assert!(!s.today_active);
    }

    #[test]
    fn streak_breaks_after_a_gap() {
        let active: HashSet<_> = ["2026-03-01", "2026-03-02", "2026-03-10"]
            .iter()
            .map(|s| d(s))
            .collect();
        let s = compute_streaks(&active, &HashSet::new(), d("2026-03-11"));
        assert_eq!(s.current_streak, 1);
        assert_eq!(s.longest_streak, 2);
        assert_eq!(s.active_days_30, 3);
    }

    #[test]
    fn daily_stats_use_local_dates() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        // Insert a row "now" and make sure today's stats count it, whatever the TZ.
        conn.execute(
            "INSERT INTO water_log (timestamp, consumed, amount_ml) VALUES (?1, 1, 300)",
            [time::now_utc()],
        )
        .unwrap();
        let stats = daily_stats(&conn, &time::today_local());
        assert_eq!(stats.water_consumed, 1);
        assert_eq!(stats.water_total_ml, 300);
    }
}
