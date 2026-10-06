//! SQL for the health tables. Every function takes an open connection so the
//! commands and the scheduler can share one lock scope.

use chrono::{DateTime, Local, NaiveDate, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use super::{
    AdherenceStats, Condition, ConditionInput, DiaryEntry, DiaryInput, DoseLog, DoseSlot,
    Measurement, MeasurementInput, Medicine, MedicineInput,
};
use crate::db::time;

type R<T> = Result<T, String>;

fn e(err: rusqlite::Error) -> String {
    err.to_string()
}

// ─── Medicines ─────────────────────────────────────────────────────────────

fn medicine_from_row(row: &Row) -> rusqlite::Result<Medicine> {
    let times: String = row.get(4)?;
    let days: String = row.get(5)?;
    Ok(Medicine {
        id: row.get(0)?,
        name: row.get(1)?,
        dose: row.get(2)?,
        instructions: row.get(3)?,
        times: serde_json::from_str(&times).unwrap_or_default(),
        days: serde_json::from_str(&days).unwrap_or_default(),
        active: row.get::<_, i64>(6)? == 1,
        start_date: row.get(7)?,
        end_date: row.get(8)?,
        color: row.get(9)?,
        created_at: time::to_rfc3339(&row.get::<_, String>(10)?),
    })
}

const MED_COLS: &str =
    "id, name, dose, instructions, times, days, active, start_date, end_date, color, created_at";

pub fn list_medicines(conn: &Connection) -> R<Vec<Medicine>> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {MED_COLS} FROM medicines ORDER BY active DESC, name COLLATE NOCASE"
        ))
        .map_err(e)?;
    let rows = stmt
        .query_map([], medicine_from_row)
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

pub fn get_medicine(conn: &Connection, id: i64) -> R<Option<Medicine>> {
    conn.query_row(
        &format!("SELECT {MED_COLS} FROM medicines WHERE id = ?1"),
        [id],
        medicine_from_row,
    )
    .optional()
    .map_err(e)
}

pub fn save_medicine(conn: &Connection, input: &MedicineInput) -> R<Medicine> {
    let times = serde_json::to_string(&input.times).map_err(|x| x.to_string())?;
    let days = serde_json::to_string(&input.days).map_err(|x| x.to_string())?;
    let id = match input.id {
        Some(id) => {
            let n = conn
                .execute(
                    "UPDATE medicines SET name=?1, dose=?2, instructions=?3, times=?4, days=?5,
                     active=?6, start_date=?7, end_date=?8, color=?9, updated_at=?10 WHERE id=?11",
                    params![
                        input.name,
                        input.dose,
                        input.instructions,
                        times,
                        days,
                        input.active as i64,
                        input.start_date,
                        input.end_date,
                        input.color,
                        time::now_utc(),
                        id
                    ],
                )
                .map_err(e)?;
            if n == 0 {
                return Err("Medicine not found".into());
            }
            id
        }
        None => {
            conn.execute(
                "INSERT INTO medicines (name, dose, instructions, times, days, active, start_date, end_date, color, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
                params![
                    input.name,
                    input.dose,
                    input.instructions,
                    times,
                    days,
                    input.active as i64,
                    input.start_date,
                    input.end_date,
                    input.color,
                    time::now_utc()
                ],
            )
            .map_err(e)?;
            conn.last_insert_rowid()
        }
    };
    get_medicine(conn, id)?.ok_or_else(|| "Medicine vanished".into())
}

pub fn delete_medicine(conn: &Connection, id: i64) -> R<()> {
    conn.execute("DELETE FROM dose_log WHERE medicine_id = ?1", [id])
        .map_err(e)?;
    conn.execute("DELETE FROM medicines WHERE id = ?1", [id])
        .map_err(e)?;
    Ok(())
}

/// Local calendar date the medicine was created on; slots before it never existed.
fn created_local_date(m: &Medicine) -> Option<NaiveDate> {
    DateTime::parse_from_rfc3339(&m.created_at)
        .ok()
        .map(|t| t.with_timezone(&Local).date_naive())
}

// ─── Dose log ──────────────────────────────────────────────────────────────

fn dose_from_row(row: &Row) -> rusqlite::Result<DoseLog> {
    Ok(DoseLog {
        id: row.get(0)?,
        medicine_id: row.get(1)?,
        scheduled_at: row.get(2)?,
        status: row.get(3)?,
        taken_at: row
            .get::<_, Option<String>>(4)?
            .map(|s| time::to_rfc3339(&s)),
        snoozed_until: row.get(5)?,
        note: row.get(6)?,
    })
}

const DOSE_COLS: &str = "id, medicine_id, scheduled_at, status, taken_at, snoozed_until, note";

/// Log rows whose slot falls on `date` (local).
pub fn dose_logs_for_date(conn: &Connection, date: &str) -> R<Vec<DoseLog>> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {DOSE_COLS} FROM dose_log WHERE substr(scheduled_at, 1, 10) = ?1"
        ))
        .map_err(e)?;
    let rows = stmt
        .query_map([date], dose_from_row)
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

/// Make sure a row exists for the slot (status pending). No-op if present.
pub fn ensure_dose_row(conn: &Connection, medicine_id: i64, scheduled_at: &str) -> R<()> {
    conn.execute(
        "INSERT INTO dose_log (medicine_id, scheduled_at, status, created_at) VALUES (?1, ?2, 'pending', ?3)
         ON CONFLICT(medicine_id, scheduled_at) DO NOTHING",
        params![medicine_id, scheduled_at, time::now_utc()],
    )
    .map_err(e)?;
    Ok(())
}

/// Set a final or intermediate status for a slot, creating the row if needed.
pub fn set_dose_status(
    conn: &Connection,
    medicine_id: i64,
    scheduled_at: &str,
    status: &str,
    note: Option<&str>,
    snoozed_until: Option<&str>,
) -> R<DoseLog> {
    if !["pending", "snoozed", "taken", "skipped", "missed"].contains(&status) {
        return Err("Invalid dose status".into());
    }
    ensure_dose_row(conn, medicine_id, scheduled_at)?;
    let taken_at = if status == "taken" {
        Some(time::now_utc())
    } else {
        None
    };
    conn.execute(
        "UPDATE dose_log SET status = ?1, taken_at = ?2, snoozed_until = ?3,
                note = COALESCE(?4, note)
         WHERE medicine_id = ?5 AND scheduled_at = ?6",
        params![
            status,
            taken_at,
            snoozed_until,
            note,
            medicine_id,
            scheduled_at
        ],
    )
    .map_err(e)?;
    conn.query_row(
        &format!("SELECT {DOSE_COLS} FROM dose_log WHERE medicine_id = ?1 AND scheduled_at = ?2"),
        params![medicine_id, scheduled_at],
        dose_from_row,
    )
    .map_err(e)
}

/// The schedule for one local date: every slot the medicines define, merged
/// with whatever was logged (including logs for medicines since deleted).
pub fn schedule_for_date(conn: &Connection, date: &str) -> R<Vec<DoseSlot>> {
    let day =
        NaiveDate::parse_from_str(date, "%Y-%m-%d").map_err(|_| "invalid date".to_string())?;
    let meds = list_medicines(conn)?;
    let logs = dose_logs_for_date(conn, date)?;
    let today = time::today_local();
    let now_slot = Local::now().format(super::SLOT_FMT).to_string();

    let mut slots: Vec<DoseSlot> = Vec::new();
    for (mid, dt) in super::slots_for_date(&meds, day) {
        let Some(m) = meds.iter().find(|m| m.id == mid) else {
            continue;
        };
        let key = super::slot_string(dt);
        let log = logs
            .iter()
            .find(|l| l.medicine_id == mid && l.scheduled_at == key);
        if log.is_none() && created_local_date(m).map(|c| day < c).unwrap_or(false) {
            continue;
        }
        let status = match log {
            Some(l) => l.status.clone(),
            None if date < today.as_str() => "missed".into(),
            None if date == today && key.as_str() <= now_slot.as_str() => "pending".into(),
            None => "upcoming".into(),
        };
        slots.push(DoseSlot {
            medicine_id: mid,
            name: m.name.clone(),
            dose: m.dose.clone(),
            instructions: m.instructions.clone(),
            color: m.color.clone(),
            scheduled_at: key,
            status,
            taken_at: log.and_then(|l| l.taken_at.clone()),
            note: log.map(|l| l.note.clone()).unwrap_or_default(),
        });
    }
    // Logged doses whose medicine schedule no longer produces them.
    for l in &logs {
        if slots
            .iter()
            .any(|s| s.medicine_id == l.medicine_id && s.scheduled_at == l.scheduled_at)
        {
            continue;
        }
        let m = meds.iter().find(|m| m.id == l.medicine_id);
        slots.push(DoseSlot {
            medicine_id: l.medicine_id,
            name: m
                .map(|m| m.name.clone())
                .unwrap_or_else(|| "Removed medicine".into()),
            dose: m.map(|m| m.dose.clone()).unwrap_or_default(),
            instructions: String::new(),
            color: m
                .map(|m| m.color.clone())
                .unwrap_or_else(|| "#9ca3af".into()),
            scheduled_at: l.scheduled_at.clone(),
            status: l.status.clone(),
            taken_at: l.taken_at.clone(),
            note: l.note.clone(),
        });
    }
    slots.sort_by(|a, b| {
        a.scheduled_at
            .cmp(&b.scheduled_at)
            .then(a.name.cmp(&b.name))
    });
    Ok(slots)
}

/// Adherence over the last `days` days including today.
pub fn adherence(conn: &Connection, days: i64) -> R<AdherenceStats> {
    let days = days.clamp(1, 365);
    let today = time::today_local();
    let from = time::add_days(&today, -(days - 1));
    let mut stats = AdherenceStats {
        days,
        ..Default::default()
    };
    // Count logged outcomes.
    let mut stmt = conn
        .prepare(
            "SELECT status, COUNT(*) FROM dose_log
             WHERE substr(scheduled_at,1,10) BETWEEN ?1 AND ?2 GROUP BY status",
        )
        .map_err(e)?;
    let rows = stmt
        .query_map(params![from, today], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
        })
        .map_err(e)?;
    for (status, n) in rows.flatten() {
        match status.as_str() {
            "taken" => stats.taken += n,
            "skipped" => stats.skipped += n,
            "missed" => stats.missed += n,
            _ => stats.pending += n,
        }
    }
    // Past slots without any row count as missed.
    let meds = list_medicines(conn)?;
    let mut d = NaiveDate::parse_from_str(&from, "%Y-%m-%d").map_err(|_| "bad date")?;
    let end = NaiveDate::parse_from_str(&today, "%Y-%m-%d").map_err(|_| "bad date")?;
    let now_slot = Local::now().format(super::SLOT_FMT).to_string();
    let mut unlogged_missed = 0;
    let mut scheduled = 0;
    while d <= end {
        let ds = d.format("%Y-%m-%d").to_string();
        let logs = dose_logs_for_date(conn, &ds)?;
        for (mid, dt) in super::slots_for_date(&meds, d) {
            let key = super::slot_string(dt);
            if key.as_str() > now_slot.as_str() {
                continue;
            }
            let predates = meds
                .iter()
                .find(|m| m.id == mid)
                .and_then(created_local_date)
                .map(|c| d < c)
                .unwrap_or(false);
            if predates
                && !logs
                    .iter()
                    .any(|l| l.medicine_id == mid && l.scheduled_at == key)
            {
                continue;
            }
            scheduled += 1;
            if !logs
                .iter()
                .any(|l| l.medicine_id == mid && l.scheduled_at == key)
            {
                unlogged_missed += 1;
            }
        }
        d += chrono::Duration::days(1);
    }
    stats.missed += unlogged_missed;
    stats.scheduled = scheduled.max(stats.taken + stats.skipped + stats.missed + stats.pending);
    let answered = stats.taken + stats.skipped + stats.missed;
    stats.adherence_pct = if answered > 0 {
        (stats.taken as f64 / answered as f64 * 100.0).round()
    } else {
        0.0
    };
    Ok(stats)
}

// ─── Conditions ────────────────────────────────────────────────────────────

fn condition_from_row(row: &Row) -> rusqlite::Result<Condition> {
    Ok(Condition {
        id: row.get(0)?,
        name: row.get(1)?,
        notes: row.get(2)?,
        severity: row.get(3)?,
        status: row.get(4)?,
        started_on: row.get(5)?,
        resolved_on: row.get(6)?,
        created_at: time::to_rfc3339(&row.get::<_, String>(7)?),
        updated_at: time::to_rfc3339(&row.get::<_, String>(8)?),
    })
}

const COND_COLS: &str =
    "id, name, notes, severity, status, started_on, resolved_on, created_at, updated_at";

pub fn list_conditions(conn: &Connection) -> R<Vec<Condition>> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {COND_COLS} FROM conditions ORDER BY status ASC, severity DESC, name COLLATE NOCASE"
        ))
        .map_err(e)?;
    let rows = stmt
        .query_map([], condition_from_row)
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

pub fn save_condition(conn: &Connection, input: &ConditionInput) -> R<Condition> {
    let resolved_on = if input.status == "resolved" {
        input
            .resolved_on
            .clone()
            .or_else(|| Some(time::today_local()))
    } else {
        None
    };
    let id = match input.id {
        Some(id) => {
            let n = conn
                .execute(
                    "UPDATE conditions SET name=?1, notes=?2, severity=?3, status=?4, started_on=?5,
                     resolved_on=?6, updated_at=?7 WHERE id=?8",
                    params![
                        input.name,
                        input.notes,
                        input.severity,
                        input.status,
                        input.started_on,
                        resolved_on,
                        time::now_utc(),
                        id
                    ],
                )
                .map_err(e)?;
            if n == 0 {
                return Err("Condition not found".into());
            }
            id
        }
        None => {
            conn.execute(
                "INSERT INTO conditions (name, notes, severity, status, started_on, resolved_on, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
                params![
                    input.name,
                    input.notes,
                    input.severity,
                    input.status,
                    input.started_on.clone().or_else(|| Some(time::today_local())),
                    resolved_on,
                    time::now_utc()
                ],
            )
            .map_err(e)?;
            conn.last_insert_rowid()
        }
    };
    conn.query_row(
        &format!("SELECT {COND_COLS} FROM conditions WHERE id = ?1"),
        [id],
        condition_from_row,
    )
    .map_err(e)
}

pub fn delete_condition(conn: &Connection, id: i64) -> R<()> {
    conn.execute(
        "UPDATE diary_entries SET condition_id = NULL WHERE condition_id = ?1",
        [id],
    )
    .map_err(e)?;
    conn.execute("DELETE FROM conditions WHERE id = ?1", [id])
        .map_err(e)?;
    Ok(())
}

// ─── Diary ─────────────────────────────────────────────────────────────────

fn diary_from_row(row: &Row) -> rusqlite::Result<DiaryEntry> {
    let ts: String = row.get(1)?;
    let date: String = row.get(2)?;
    let symptoms: String = row.get(7)?;
    Ok(DiaryEntry {
        id: row.get(0)?,
        timestamp: time::to_rfc3339(&ts),
        date,
        mood: row.get(3)?,
        energy: row.get(4)?,
        sleep_hours: row.get(5)?,
        pain: row.get(6)?,
        symptoms: serde_json::from_str(&symptoms).unwrap_or_default(),
        notes: row.get(8)?,
        condition_id: row.get(9)?,
    })
}

const DIARY_SELECT: &str = "SELECT id, timestamp, date(timestamp, 'localtime'), mood, energy, sleep_hours, pain, symptoms, notes, condition_id FROM diary_entries";

/// Entries between two local dates, inclusive, newest first.
pub fn list_diary(conn: &Connection, from: &str, to: &str) -> R<Vec<DiaryEntry>> {
    let mut stmt = conn
        .prepare(&format!(
            "{DIARY_SELECT} WHERE date(timestamp,'localtime') BETWEEN ?1 AND ?2 ORDER BY timestamp DESC"
        ))
        .map_err(e)?;
    let rows = stmt
        .query_map(params![from, to], diary_from_row)
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

pub fn save_diary(conn: &Connection, input: &DiaryInput) -> R<DiaryEntry> {
    let symptoms = serde_json::to_string(&input.symptoms).map_err(|x| x.to_string())?;
    let ts = match &input.timestamp {
        Some(t) => DateTime::parse_from_rfc3339(t)
            .map_err(|_| "Invalid timestamp".to_string())?
            .with_timezone(&Utc)
            .format(time::SQLITE_FMT)
            .to_string(),
        None => time::now_utc(),
    };
    let id = match input.id {
        Some(id) => {
            let n = conn
                .execute(
                    "UPDATE diary_entries SET timestamp=?1, mood=?2, energy=?3, sleep_hours=?4, pain=?5,
                     symptoms=?6, notes=?7, condition_id=?8, updated_at=?9 WHERE id=?10",
                    params![
                        ts,
                        input.mood,
                        input.energy,
                        input.sleep_hours,
                        input.pain,
                        symptoms,
                        input.notes,
                        input.condition_id,
                        time::now_utc(),
                        id
                    ],
                )
                .map_err(e)?;
            if n == 0 {
                return Err("Entry not found".into());
            }
            id
        }
        None => {
            conn.execute(
                "INSERT INTO diary_entries (timestamp, mood, energy, sleep_hours, pain, symptoms, notes, condition_id, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
                params![
                    ts,
                    input.mood,
                    input.energy,
                    input.sleep_hours,
                    input.pain,
                    symptoms,
                    input.notes,
                    input.condition_id,
                    time::now_utc()
                ],
            )
            .map_err(e)?;
            conn.last_insert_rowid()
        }
    };
    conn.query_row(
        &format!("{DIARY_SELECT} WHERE id = ?1"),
        [id],
        diary_from_row,
    )
    .map_err(e)
}

pub fn delete_diary(conn: &Connection, id: i64) -> R<()> {
    conn.execute("DELETE FROM diary_entries WHERE id = ?1", [id])
        .map_err(e)?;
    Ok(())
}

/// Distinct symptom names seen so far, most frequent first (for suggestions).
pub fn symptom_suggestions(conn: &Connection) -> R<Vec<String>> {
    let mut stmt = conn
        .prepare("SELECT symptoms FROM diary_entries ORDER BY timestamp DESC LIMIT 500")
        .map_err(e)?;
    let mut counts: std::collections::HashMap<String, usize> = Default::default();
    for s in stmt
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(e)?
        .flatten()
    {
        let list: Vec<String> = serde_json::from_str(&s).unwrap_or_default();
        for item in list {
            *counts.entry(item).or_default() += 1;
        }
    }
    let mut v: Vec<(String, usize)> = counts.into_iter().collect();
    v.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    Ok(v.into_iter().map(|(s, _)| s).take(30).collect())
}

// ─── Measurements ──────────────────────────────────────────────────────────

fn measurement_from_row(row: &Row) -> rusqlite::Result<Measurement> {
    Ok(Measurement {
        id: row.get(0)?,
        kind: row.get(1)?,
        value: row.get(2)?,
        value2: row.get(3)?,
        unit: row.get(4)?,
        measured_at: time::to_rfc3339(&row.get::<_, String>(5)?),
        notes: row.get(6)?,
    })
}

const MEAS_COLS: &str = "id, kind, value, value2, unit, measured_at, notes";

pub fn list_measurements(conn: &Connection, kind: Option<&str>, days: i64) -> R<Vec<Measurement>> {
    let days = days.clamp(1, 3650);
    let from = time::add_days(&time::today_local(), -(days - 1));
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {MEAS_COLS} FROM measurements
             WHERE date(measured_at,'localtime') >= ?1 AND (?2 IS NULL OR kind = ?2)
             ORDER BY measured_at DESC"
        ))
        .map_err(e)?;
    let rows = stmt
        .query_map(params![from, kind], measurement_from_row)
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

pub fn add_measurement(conn: &Connection, input: &MeasurementInput, unit: &str) -> R<Measurement> {
    let ts = match &input.measured_at {
        Some(t) => DateTime::parse_from_rfc3339(t)
            .map_err(|_| "Invalid timestamp".to_string())?
            .with_timezone(&Utc)
            .format(time::SQLITE_FMT)
            .to_string(),
        None => time::now_utc(),
    };
    conn.execute(
        "INSERT INTO measurements (kind, value, value2, unit, measured_at, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![input.kind, input.value, input.value2, unit, ts, input.notes.trim()],
    )
    .map_err(e)?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        &format!("SELECT {MEAS_COLS} FROM measurements WHERE id = ?1"),
        [id],
        measurement_from_row,
    )
    .map_err(e)
}

pub fn delete_measurement(conn: &Connection, id: i64) -> R<()> {
    conn.execute("DELETE FROM measurements WHERE id = ?1", [id])
        .map_err(e)?;
    Ok(())
}

// ─── Export helpers ────────────────────────────────────────────────────────

pub fn all_dose_logs(conn: &Connection) -> R<Vec<DoseLog>> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {DOSE_COLS} FROM dose_log ORDER BY scheduled_at"
        ))
        .map_err(e)?;
    let rows = stmt
        .query_map([], dose_from_row)
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

pub fn all_diary(conn: &Connection) -> R<Vec<DiaryEntry>> {
    let mut stmt = conn
        .prepare(&format!("{DIARY_SELECT} ORDER BY timestamp"))
        .map_err(e)?;
    let rows = stmt
        .query_map([], diary_from_row)
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

pub fn all_measurements(conn: &Connection) -> R<Vec<Measurement>> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {MEAS_COLS} FROM measurements ORDER BY measured_at"
        ))
        .map_err(e)?;
    let rows = stmt
        .query_map([], measurement_from_row)
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::DbState;

    fn input(name: &str) -> MedicineInput {
        MedicineInput {
            id: None,
            name: name.into(),
            dose: "1 tablet".into(),
            instructions: String::new(),
            times: vec!["08:00".into()],
            days: vec![1, 2, 3, 4, 5, 6, 7],
            active: true,
            start_date: None,
            end_date: None,
            color: "#000".into(),
        }
    }

    #[test]
    fn medicine_roundtrip_and_delete() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let m = save_medicine(&conn, &input("Metformin")).unwrap();
        assert_eq!(m.times, vec!["08:00"]);
        let mut upd = input("Metformin XR");
        upd.id = Some(m.id);
        upd.times = vec!["20:00".into()];
        let m2 = save_medicine(&conn, &upd).unwrap();
        assert_eq!(m2.id, m.id);
        assert_eq!(m2.name, "Metformin XR");
        assert_eq!(list_medicines(&conn).unwrap().len(), 1);
        delete_medicine(&conn, m.id).unwrap();
        assert!(list_medicines(&conn).unwrap().is_empty());
    }

    #[test]
    fn dose_status_upserts_and_schedule_merges() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let m = save_medicine(&conn, &input("A")).unwrap();
        let today = time::today_local();
        let slot = format!("{today} 08:00");
        let log = set_dose_status(&conn, m.id, &slot, "taken", Some("with food"), None).unwrap();
        assert_eq!(log.status, "taken");
        assert!(log.taken_at.is_some());
        // Second call updates the same row.
        let log2 = set_dose_status(&conn, m.id, &slot, "skipped", None, None).unwrap();
        assert_eq!(log2.id, log.id);
        assert_eq!(log2.note, "with food", "note kept when not provided");
        let sched = schedule_for_date(&conn, &today).unwrap();
        assert_eq!(sched.len(), 1);
        assert_eq!(sched[0].status, "skipped");
        assert!(set_dose_status(&conn, m.id, &slot, "bogus", None, None).is_err());
    }

    #[test]
    fn adherence_counts_unlogged_past_slots_as_missed() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let mut i = input("B");
        i.times = vec!["00:00".into()]; // always in the past today
        let m = save_medicine(&conn, &i).unwrap();
        let today = time::today_local();
        let stats = adherence(&conn, 1).unwrap();
        assert_eq!(stats.scheduled, 1);
        assert_eq!(stats.missed, 1);
        set_dose_status(&conn, m.id, &format!("{today} 00:00"), "taken", None, None).unwrap();
        let stats = adherence(&conn, 1).unwrap();
        assert_eq!(stats.taken, 1);
        assert_eq!(stats.missed, 0);
        assert_eq!(stats.adherence_pct, 100.0);
    }

    #[test]
    fn conditions_diary_and_measurements() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let c = save_condition(
            &conn,
            &ConditionInput {
                id: None,
                name: "Migraine".into(),
                notes: String::new(),
                severity: 3,
                status: "active".into(),
                started_on: None,
                resolved_on: None,
            },
        )
        .unwrap();
        assert!(c.started_on.is_some());

        let d = save_diary(
            &conn,
            &DiaryInput {
                id: None,
                timestamp: None,
                mood: Some(3),
                energy: Some(2),
                sleep_hours: Some(6.5),
                pain: Some(4),
                symptoms: vec!["headache".into()],
                notes: "rough morning".into(),
                condition_id: Some(c.id),
            },
        )
        .unwrap();
        assert_eq!(d.date, time::today_local());
        let today = time::today_local();
        assert_eq!(list_diary(&conn, &today, &today).unwrap().len(), 1);
        assert_eq!(symptom_suggestions(&conn).unwrap(), vec!["headache"]);

        // Deleting the condition keeps the entry, unlinks it.
        delete_condition(&conn, c.id).unwrap();
        let entries = list_diary(&conn, &today, &today).unwrap();
        assert_eq!(entries[0].condition_id, None);

        let mut mi = MeasurementInput {
            kind: "blood_pressure".into(),
            value: 120.0,
            value2: Some(80.0),
            measured_at: None,
            notes: String::new(),
        };
        let unit = mi.validate().unwrap();
        let m = add_measurement(&conn, &mi, unit).unwrap();
        assert_eq!(m.unit, "mmHg");
        assert_eq!(
            list_measurements(&conn, Some("blood_pressure"), 7)
                .unwrap()
                .len(),
            1
        );
        assert!(list_measurements(&conn, Some("weight"), 7)
            .unwrap()
            .is_empty());
        delete_measurement(&conn, m.id).unwrap();
        assert!(list_measurements(&conn, None, 7).unwrap().is_empty());
    }
}
