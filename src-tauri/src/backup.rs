//! `.hay` backups (everything) and `.su` snapshots (shareable health records),
//! plus daily automatic backups and a Markdown health report.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::ai::Provider;
use crate::care::CareRoutine;
use crate::db::models::{MovementEntry, PomodoroEntry, UserProfile, WaterEntry};
use crate::db::time;
use crate::health::store as hstore;
use crate::health::{Condition, DiaryEntry, DoseLog, FoodEntry, Measurement, Medicine};

pub const HAY_FORMAT: &str = "haysu-backup";
pub const SU_FORMAT: &str = "haysu-snapshot";
pub const FORMAT_VERSION: u32 = 1;

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Archive {
    pub format: String,
    pub format_version: u32,
    pub app_version: String,
    pub created_at: String,
    pub exported_by: String,
    pub profile: Option<UserProfile>,
    pub settings: HashMap<String, String>,
    pub water_log: Vec<WaterEntry>,
    pub movement_log: Vec<MovementEntry>,
    pub pomodoro_log: Vec<PomodoroEntry>,
    pub medicines: Vec<Medicine>,
    pub dose_log: Vec<DoseLog>,
    pub conditions: Vec<Condition>,
    pub diary: Vec<DiaryEntry>,
    pub measurements: Vec<Measurement>,
    pub food_log: Vec<FoodEntry>,
    pub care_routines: Vec<CareRoutine>,
    pub ai_conversations: Vec<Value>,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct ImportReport {
    pub format: String,
    pub created_at: String,
    pub exported_by: String,
    pub profile: bool,
    pub settings: usize,
    pub water: usize,
    pub movement: usize,
    pub pomodoro: usize,
    pub medicines: usize,
    pub doses: usize,
    pub conditions: usize,
    pub diary: usize,
    pub measurements: usize,
    pub food: usize,
    pub care_routines: usize,
    pub skipped: usize,
}

fn e(err: rusqlite::Error) -> String {
    err.to_string()
}

fn ts_storage(rfc: &str) -> String {
    // Archives carry RFC 3339 UTC; the tables use the SQLite format.
    chrono::DateTime::parse_from_rfc3339(rfc)
        .map(|d| {
            d.with_timezone(&chrono::Utc)
                .format(time::SQLITE_FMT)
                .to_string()
        })
        .unwrap_or_else(|_| rfc.to_string())
}

// ─── Gather ────────────────────────────────────────────────────────────────

fn settings_without_keys(conn: &Connection) -> Result<HashMap<String, String>, String> {
    let secret: Vec<&str> = Provider::ALL.iter().map(|p| p.key_setting()).collect();
    let mut stmt = conn.prepare("SELECT key, value FROM settings").map_err(e)?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(e)?
        .filter_map(Result::ok)
        .filter(|(k, _)| !secret.contains(&k.as_str()))
        .collect();
    Ok(rows)
}

fn water_all(conn: &Connection) -> Result<Vec<WaterEntry>, String> {
    let mut stmt = conn
        .prepare("SELECT id, timestamp, consumed, amount_ml FROM water_log ORDER BY timestamp")
        .map_err(e)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(WaterEntry {
                id: row.get(0)?,
                timestamp: time::to_rfc3339(&row.get::<_, String>(1)?),
                consumed: row.get::<_, i32>(2)? == 1,
                amount_ml: row.get(3)?,
            })
        })
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

fn movement_all(conn: &Connection) -> Result<Vec<MovementEntry>, String> {
    let mut stmt = conn
        .prepare("SELECT id, timestamp, exercise_id, exercise_name, category, completed FROM movement_log ORDER BY timestamp")
        .map_err(e)?;
    let rows = stmt
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
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

fn pomodoro_all(conn: &Connection) -> Result<Vec<PomodoroEntry>, String> {
    let mut stmt = conn
        .prepare("SELECT id, started_at, ended_at, session_type, completed FROM pomodoro_log ORDER BY started_at")
        .map_err(e)?;
    let rows = stmt
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
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

fn conversations_all(conn: &Connection) -> Result<Vec<Value>, String> {
    let convs = crate::ai::store::list_conversations(conn, 500)?;
    let mut out = Vec::new();
    for c in convs {
        let msgs = crate::ai::store::messages(conn, c.id)?;
        out.push(serde_json::json!({
            "title": c.title, "kind": c.kind, "created_at": c.created_at, "updated_at": c.updated_at,
            "messages": msgs.iter().map(|m| serde_json::json!({
                "role": m.role, "content": m.content, "has_image": m.has_image,
                "provider": m.provider, "model": m.model, "created_at": m.created_at
            })).collect::<Vec<_>>()
        }));
    }
    Ok(out)
}

pub fn gather(conn: &Connection, full: bool, include_ai: bool) -> Result<Archive, String> {
    let profile = crate::commands::user::read_profile(conn);
    Ok(Archive {
        format: if full { HAY_FORMAT } else { SU_FORMAT }.into(),
        format_version: FORMAT_VERSION,
        app_version: env!("CARGO_PKG_VERSION").into(),
        created_at: chrono::Utc::now().to_rfc3339(),
        exported_by: profile.as_ref().map(|p| p.name.clone()).unwrap_or_default(),
        profile,
        settings: if full {
            settings_without_keys(conn)?
        } else {
            HashMap::new()
        },
        water_log: if full { water_all(conn)? } else { vec![] },
        movement_log: if full { movement_all(conn)? } else { vec![] },
        pomodoro_log: if full { pomodoro_all(conn)? } else { vec![] },
        medicines: hstore::list_medicines(conn)?,
        dose_log: hstore::all_dose_logs(conn)?,
        conditions: hstore::list_conditions(conn)?,
        diary: hstore::all_diary(conn)?,
        measurements: hstore::all_measurements(conn)?,
        food_log: hstore::list_food(conn, 3650)?,
        care_routines: if full {
            crate::care::store::list(conn)?
        } else {
            vec![]
        },
        ai_conversations: if full && include_ai {
            conversations_all(conn)?
        } else {
            vec![]
        },
    })
}

pub fn write(archive: &Archive, path: &Path) -> Result<String, String> {
    let json = serde_json::to_string_pretty(archive).map_err(|x| x.to_string())?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|x| x.to_string())?;
    }
    fs::write(path, json).map_err(|x| format!("cannot write {}: {x}", path.display()))?;
    Ok(path.to_string_lossy().into_owned())
}

pub fn read(path: &Path) -> Result<Archive, String> {
    let meta = fs::metadata(path).map_err(|x| x.to_string())?;
    if meta.len() > 200 * 1024 * 1024 {
        return Err("File is larger than 200 MB".into());
    }
    let text = fs::read_to_string(path).map_err(|x| x.to_string())?;
    let a: Archive = serde_json::from_str(&text)
        .map_err(|_| "This is not a Haysu .hay or .su file (or it is damaged)".to_string())?;
    if a.format != HAY_FORMAT && a.format != SU_FORMAT {
        return Err("Unknown archive format".into());
    }
    if a.format_version > FORMAT_VERSION {
        return Err(format!(
            "This file was made by a newer Haysu (format v{}). Update Haysu first.",
            a.format_version
        ));
    }
    Ok(a)
}

// ─── Import ────────────────────────────────────────────────────────────────

fn exists(conn: &Connection, sql: &str, p: impl rusqlite::Params) -> bool {
    conn.query_row(sql, p, |r| r.get::<_, i64>(0))
        .map(|n| n > 0)
        .unwrap_or(false)
}

/// Merge the archive into the database. `replace` wipes activity and health
/// tables first (settings keys are never touched).
pub fn import(conn: &Connection, a: &Archive, replace: bool) -> Result<ImportReport, String> {
    let mut rep = ImportReport {
        format: a.format.clone(),
        created_at: a.created_at.clone(),
        exported_by: a.exported_by.clone(),
        ..Default::default()
    };
    let tx = conn.unchecked_transaction().map_err(e)?;

    if replace {
        tx.execute_batch(
            "DELETE FROM water_log; DELETE FROM movement_log; DELETE FROM pomodoro_log;
             DELETE FROM dose_log; DELETE FROM medicines; DELETE FROM conditions;
             DELETE FROM diary_entries; DELETE FROM measurements; DELETE FROM food_log;
             DELETE FROM care_routines;",
        )
        .map_err(e)?;
    }

    // Profile: an archive with a profile overwrites (fields are merged by the caller's choice).
    if let Some(p) = &a.profile {
        tx.execute(
            "INSERT INTO user_profile (id, name, age, weight_kg, height_cm, occupation, work_style, daily_water_ml,
                gender, diet, diet_notes, cuisines, health_goal, dress_style, wardrobe_notes, about_me, created_at, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?16)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, age=excluded.age, weight_kg=excluded.weight_kg,
                height_cm=excluded.height_cm, occupation=excluded.occupation, work_style=excluded.work_style,
                daily_water_ml=excluded.daily_water_ml, gender=excluded.gender, diet=excluded.diet,
                diet_notes=excluded.diet_notes, cuisines=excluded.cuisines, health_goal=excluded.health_goal,
                dress_style=excluded.dress_style, wardrobe_notes=excluded.wardrobe_notes, about_me=excluded.about_me,
                updated_at=excluded.updated_at",
            params![
                p.name, p.age, p.weight_kg, p.height_cm, p.occupation, p.work_style, p.daily_water_ml,
                p.gender, p.diet, p.diet_notes, p.cuisines, p.health_goal, p.dress_style, p.wardrobe_notes,
                p.about_me, time::now_utc()
            ],
        )
        .map_err(e)?;
        rep.profile = true;
    }

    // Settings (never API keys, never widget position of another machine).
    let secret: Vec<&str> = Provider::ALL.iter().map(|p| p.key_setting()).collect();
    for (k, v) in &a.settings {
        if secret.contains(&k.as_str()) || k == "widget_x" || k == "widget_y" {
            continue;
        }
        tx.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![k, v],
        )
        .map_err(e)?;
        rep.settings += 1;
    }

    for w in &a.water_log {
        let ts = ts_storage(&w.timestamp);
        if exists(
            &tx,
            "SELECT COUNT(*) FROM water_log WHERE timestamp = ?1 AND amount_ml = ?2",
            params![ts, w.amount_ml],
        ) {
            rep.skipped += 1;
            continue;
        }
        tx.execute(
            "INSERT INTO water_log (timestamp, consumed, amount_ml) VALUES (?1, ?2, ?3)",
            params![ts, w.consumed as i32, w.amount_ml],
        )
        .map_err(e)?;
        rep.water += 1;
    }
    for m in &a.movement_log {
        let ts = ts_storage(&m.timestamp);
        if exists(
            &tx,
            "SELECT COUNT(*) FROM movement_log WHERE timestamp = ?1 AND exercise_id = ?2",
            params![ts, m.exercise_id],
        ) {
            rep.skipped += 1;
            continue;
        }
        tx.execute(
            "INSERT INTO movement_log (timestamp, exercise_id, exercise_name, category, completed) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![ts, m.exercise_id, m.exercise_name, m.category, m.completed as i32],
        )
        .map_err(e)?;
        rep.movement += 1;
    }
    for p in &a.pomodoro_log {
        let ts = ts_storage(&p.started_at);
        if exists(
            &tx,
            "SELECT COUNT(*) FROM pomodoro_log WHERE started_at = ?1",
            [&ts],
        ) {
            rep.skipped += 1;
            continue;
        }
        tx.execute(
            "INSERT INTO pomodoro_log (started_at, ended_at, session_type, completed) VALUES (?1, ?2, ?3, ?4)",
            params![ts, p.ended_at.as_deref().map(ts_storage), p.session_type, p.completed as i32],
        )
        .map_err(e)?;
        rep.pomodoro += 1;
    }

    // Medicines by name (id remap for dose rows).
    let mut med_map: HashMap<i64, i64> = HashMap::new();
    for m in &a.medicines {
        let existing: Option<i64> = tx
            .query_row(
                "SELECT id FROM medicines WHERE name = ?1 COLLATE NOCASE",
                [&m.name],
                |r| r.get(0),
            )
            .ok();
        let id = match existing {
            Some(id) => {
                rep.skipped += 1;
                id
            }
            None => {
                tx.execute(
                    "INSERT INTO medicines (name, dose, instructions, times, days, active, start_date, end_date, color, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
                    params![
                        m.name, m.dose, m.instructions,
                        serde_json::to_string(&m.times).unwrap_or_else(|_| "[]".into()),
                        serde_json::to_string(&m.days).unwrap_or_else(|_| "[]".into()),
                        m.active as i64, m.start_date, m.end_date, m.color, ts_storage(&m.created_at)
                    ],
                )
                .map_err(e)?;
                rep.medicines += 1;
                tx.last_insert_rowid()
            }
        };
        med_map.insert(m.id, id);
    }
    for d in &a.dose_log {
        let Some(mid) = med_map.get(&d.medicine_id) else {
            rep.skipped += 1;
            continue;
        };
        let n = tx
            .execute(
                "INSERT INTO dose_log (medicine_id, scheduled_at, status, taken_at, snoozed_until, note, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(medicine_id, scheduled_at) DO NOTHING",
                params![
                    mid, d.scheduled_at, d.status,
                    d.taken_at.as_deref().map(ts_storage), d.snoozed_until, d.note, time::now_utc()
                ],
            )
            .map_err(e)?;
        if n == 0 {
            rep.skipped += 1;
        } else {
            rep.doses += 1;
        }
    }

    let mut cond_map: HashMap<i64, i64> = HashMap::new();
    for c in &a.conditions {
        let existing: Option<i64> = tx
            .query_row(
                "SELECT id FROM conditions WHERE name = ?1 COLLATE NOCASE",
                [&c.name],
                |r| r.get(0),
            )
            .ok();
        let id = match existing {
            Some(id) => {
                rep.skipped += 1;
                id
            }
            None => {
                tx.execute(
                    "INSERT INTO conditions (name, notes, severity, status, started_on, resolved_on, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
                    params![c.name, c.notes, c.severity, c.status, c.started_on, c.resolved_on, ts_storage(&c.created_at)],
                )
                .map_err(e)?;
                rep.conditions += 1;
                tx.last_insert_rowid()
            }
        };
        cond_map.insert(c.id, id);
    }
    for d in &a.diary {
        let ts = ts_storage(&d.timestamp);
        if exists(
            &tx,
            "SELECT COUNT(*) FROM diary_entries WHERE timestamp = ?1",
            [&ts],
        ) {
            rep.skipped += 1;
            continue;
        }
        tx.execute(
            "INSERT INTO diary_entries (timestamp, mood, energy, sleep_hours, pain, symptoms, notes, condition_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
            params![
                ts, d.mood, d.energy, d.sleep_hours, d.pain,
                serde_json::to_string(&d.symptoms).unwrap_or_else(|_| "[]".into()),
                d.notes, d.condition_id.and_then(|c| cond_map.get(&c).copied()), time::now_utc()
            ],
        )
        .map_err(e)?;
        rep.diary += 1;
    }
    for m in &a.measurements {
        let ts = ts_storage(&m.measured_at);
        if exists(
            &tx,
            "SELECT COUNT(*) FROM measurements WHERE kind = ?1 AND measured_at = ?2",
            params![m.kind, ts],
        ) {
            rep.skipped += 1;
            continue;
        }
        tx.execute(
            "INSERT INTO measurements (kind, value, value2, unit, measured_at, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![m.kind, m.value, m.value2, m.unit, ts, m.notes],
        )
        .map_err(e)?;
        rep.measurements += 1;
    }
    for f in &a.food_log {
        let ts = ts_storage(&f.timestamp);
        if exists(
            &tx,
            "SELECT COUNT(*) FROM food_log WHERE timestamp = ?1 AND description = ?2",
            params![ts, f.description],
        ) {
            rep.skipped += 1;
            continue;
        }
        tx.execute(
            "INSERT INTO food_log (timestamp, meal, description, calories, notes) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![ts, f.meal, f.description, f.calories, f.notes],
        )
        .map_err(e)?;
        rep.food += 1;
    }
    for r in &a.care_routines {
        if exists(
            &tx,
            "SELECT COUNT(*) FROM care_routines WHERE name = ?1 COLLATE NOCASE",
            [&r.name],
        ) {
            rep.skipped += 1;
            continue;
        }
        tx.execute(
            "INSERT INTO care_routines (name, icon, kind, interval_days, time_of_day, last_done, active, notes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![r.name, r.icon, r.kind, r.interval_days, r.time_of_day, r.last_done, r.active as i64, r.notes, ts_storage(&r.created_at)],
        )
        .map_err(e)?;
        rep.care_routines += 1;
    }
    for c in &a.ai_conversations {
        let title = c
            .get("title")
            .and_then(|t| t.as_str())
            .unwrap_or("Imported chat");
        let kind = c.get("kind").and_then(|t| t.as_str()).unwrap_or("chat");
        let created = c
            .get("created_at")
            .and_then(|t| t.as_str())
            .map(ts_storage)
            .unwrap_or_else(time::now_utc);
        tx.execute(
            "INSERT INTO ai_conversations (title, kind, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
            params![title, kind, created],
        )
        .map_err(e)?;
        let cid = tx.last_insert_rowid();
        if let Some(msgs) = c.get("messages").and_then(|m| m.as_array()) {
            for m in msgs {
                tx.execute(
                    "INSERT INTO ai_messages (conversation_id, role, content, has_image, provider, model, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![
                        cid,
                        m.get("role").and_then(|v| v.as_str()).unwrap_or("user"),
                        m.get("content").and_then(|v| v.as_str()).unwrap_or(""),
                        m.get("has_image").and_then(|v| v.as_bool()).unwrap_or(false) as i64,
                        m.get("provider").and_then(|v| v.as_str()).unwrap_or(""),
                        m.get("model").and_then(|v| v.as_str()).unwrap_or(""),
                        m.get("created_at").and_then(|v| v.as_str()).map(ts_storage).unwrap_or_else(time::now_utc)
                    ],
                )
                .map_err(e)?;
            }
        }
    }

    tx.commit().map_err(e)?;
    Ok(rep)
}

// ─── Automatic backups ─────────────────────────────────────────────────────

pub fn backups_dir(app_data: &Path) -> PathBuf {
    app_data.join("backups")
}

/// Write a daily `.hay` if the newest one is older than a day; keep the last `keep`.
pub fn auto_backup(
    conn: &Connection,
    app_data: &Path,
    keep: usize,
) -> Result<Option<PathBuf>, String> {
    let dir = backups_dir(app_data);
    fs::create_dir_all(&dir).map_err(|x| x.to_string())?;
    let mut existing: Vec<PathBuf> = fs::read_dir(&dir)
        .map_err(|x| x.to_string())?
        .filter_map(Result::ok)
        .map(|d| d.path())
        .filter(|p| p.extension().map(|x| x == "hay").unwrap_or(false))
        .collect();
    existing.sort();
    let today = time::today_local();
    let newest_today = existing.iter().any(|p| {
        p.file_name()
            .and_then(|n| n.to_str())
            .map(|n| n.contains(&today))
            .unwrap_or(false)
    });
    if newest_today {
        return Ok(None);
    }
    let archive = gather(conn, true, true)?;
    let path = dir.join(format!("haysu-{today}.hay"));
    write(&archive, &path)?;
    existing.push(path.clone());
    existing.sort();
    while existing.len() > keep {
        let old = existing.remove(0);
        let _ = fs::remove_file(old);
    }
    Ok(Some(path))
}

pub fn list_backups(app_data: &Path) -> Vec<(String, u64)> {
    let dir = backups_dir(app_data);
    let mut out: Vec<(String, u64)> = fs::read_dir(dir)
        .map(|rd| {
            rd.filter_map(Result::ok)
                .filter(|d| d.path().extension().map(|x| x == "hay").unwrap_or(false))
                .map(|d| {
                    (
                        d.path().to_string_lossy().into_owned(),
                        d.metadata().map(|m| m.len()).unwrap_or(0),
                    )
                })
                .collect()
        })
        .unwrap_or_default();
    out.sort_by(|a, b| b.0.cmp(&a.0));
    out
}

// ─── Health report ─────────────────────────────────────────────────────────

/// Deterministic Markdown summary (no AI) suitable for a doctor's visit.
pub fn health_report(conn: &Connection) -> Result<String, String> {
    use std::fmt::Write as _;
    let a = gather(conn, false, false)?;
    let mut s = String::new();
    let _ = writeln!(s, "# Haysu health summary\n");
    let _ = writeln!(
        s,
        "Generated {} by Haysu {}.\n",
        chrono::Local::now().format("%d %b %Y %H:%M"),
        a.app_version
    );
    if let Some(p) = &a.profile {
        let bmi = if p.height_cm > 0.0 {
            p.weight_kg / ((p.height_cm / 100.0).powi(2))
        } else {
            0.0
        };
        let _ = writeln!(
            s,
            "## Person\n- {}{}\n- Height {:.0} cm · Weight {:.1} kg · BMI {:.1}\n- Diet: {}{}\n",
            p.name,
            if p.age > 0 {
                format!(", {}", p.age)
            } else {
                String::new()
            },
            p.height_cm,
            p.weight_kg,
            bmi,
            if p.diet.is_empty() {
                "not specified".to_string()
            } else {
                p.diet.replace('_', " ")
            },
            if p.diet_notes.is_empty() {
                String::new()
            } else {
                format!(" ({})", p.diet_notes)
            }
        );
    }
    if !a.conditions.is_empty() {
        s.push_str("## Conditions\n");
        for c in &a.conditions {
            let _ = writeln!(
                s,
                "- **{}** — {} (severity {}/5){}{}",
                c.name,
                c.status,
                c.severity,
                c.started_on
                    .as_deref()
                    .map(|d| format!(", since {d}"))
                    .unwrap_or_default(),
                if c.notes.is_empty() {
                    String::new()
                } else {
                    format!(". {}", c.notes)
                }
            );
        }
        s.push('\n');
    }
    if !a.medicines.is_empty() {
        s.push_str("## Medicines\n");
        for m in &a.medicines {
            let _ = writeln!(
                s,
                "- **{}** {} — {} on {}{}",
                m.name,
                m.dose,
                m.times.join(", "),
                if m.days.len() == 7 {
                    "every day".into()
                } else {
                    format!("days {:?}", m.days)
                },
                if m.active { "" } else { " (paused)" }
            );
        }
        if let Ok(ad) = hstore::adherence(conn, 30) {
            if ad.scheduled > 0 {
                let _ = writeln!(
                    s,
                    "\nAdherence, last 30 days: {}% ({} taken, {} missed, {} skipped of {}).",
                    ad.adherence_pct, ad.taken, ad.missed, ad.skipped, ad.scheduled
                );
            }
        }
        s.push('\n');
    }
    if !a.measurements.is_empty() {
        s.push_str("## Measurements (most recent first)\n");
        let mut ms = a.measurements.clone();
        ms.sort_by(|x, y| y.measured_at.cmp(&x.measured_at));
        for m in ms.iter().take(40) {
            let val = match m.value2 {
                Some(v2) => format!("{:.0}/{:.0} {}", m.value, v2, m.unit),
                None => format!("{} {}", m.value, m.unit),
            };
            let _ = writeln!(
                s,
                "- {} · {}: {}",
                &m.measured_at[..10],
                m.kind.replace('_', " "),
                val
            );
        }
        s.push('\n');
    }
    if !a.diary.is_empty() {
        s.push_str("## Diary (last 30 entries, most recent first)\n");
        let mut d = a.diary.clone();
        d.sort_by(|x, y| y.timestamp.cmp(&x.timestamp));
        for e in d.iter().take(30) {
            let mut bits = Vec::new();
            if let Some(v) = e.mood {
                bits.push(format!("mood {v}/5"));
            }
            if let Some(v) = e.energy {
                bits.push(format!("energy {v}/5"));
            }
            if let Some(v) = e.pain {
                bits.push(format!("pain {v}/10"));
            }
            if let Some(v) = e.sleep_hours {
                bits.push(format!("sleep {v} h"));
            }
            if !e.symptoms.is_empty() {
                bits.push(format!("symptoms: {}", e.symptoms.join(", ")));
            }
            let _ = writeln!(
                s,
                "- {}: {}{}",
                e.date,
                bits.join(", "),
                if e.notes.is_empty() {
                    String::new()
                } else {
                    format!(" — {}", e.notes)
                }
            );
        }
        s.push('\n');
    }
    s.push_str("_This summary is generated from self-recorded data and is not medical advice._\n");
    Ok(s)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::DbState;

    #[test]
    fn roundtrip_merge_skips_duplicates() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        conn.execute("INSERT INTO water_log (timestamp, consumed, amount_ml) VALUES ('2026-03-11 10:00:00', 1, 250)", []).unwrap();
        conn.execute("INSERT INTO settings (key, value) VALUES ('ai_key_openai', 'secret'), ('theme', 'dark')", []).unwrap();
        hstore::save_medicine(
            &conn,
            &crate::health::MedicineInput {
                id: None,
                name: "Vitamin D".into(),
                dose: "1000 IU".into(),
                instructions: String::new(),
                times: vec!["22:36".into()],
                days: vec![1, 2, 3, 4, 5, 6, 7],
                active: true,
                start_date: None,
                end_date: None,
                color: "#000".into(),
            },
        )
        .unwrap();
        let archive = gather(&conn, true, true).unwrap();
        assert_eq!(archive.format, HAY_FORMAT);
        assert!(
            !archive.settings.contains_key("ai_key_openai"),
            "keys never leave the machine"
        );
        assert_eq!(archive.settings.get("theme").unwrap(), "dark");
        assert_eq!(archive.water_log.len(), 1);
        assert_eq!(archive.medicines.len(), 1);

        let rep = import(&conn, &archive, false).unwrap();
        assert_eq!(rep.water, 0);
        assert_eq!(rep.medicines, 0);
        assert!(rep.skipped >= 2);
        let n: i64 = conn
            .query_row("SELECT COUNT(*) FROM water_log", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 1);

        let fresh = DbState::in_memory();
        let c2 = fresh.conn.lock().unwrap();
        let rep = import(&c2, &archive, false).unwrap();
        assert_eq!(rep.water, 1);
        assert_eq!(rep.medicines, 1);
        let meds = hstore::list_medicines(&c2).unwrap();
        assert_eq!(meds[0].times, vec!["22:36"]);
    }

    #[test]
    fn snapshot_has_no_settings_or_activity() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let a = gather(&conn, false, false).unwrap();
        assert_eq!(a.format, SU_FORMAT);
        assert!(a.settings.is_empty());
        assert!(a.water_log.is_empty());
    }

    #[test]
    fn rejects_garbage_and_newer_formats() {
        let dir = std::env::temp_dir().join(format!("haysu-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let bad = dir.join("x.hay");
        fs::write(&bad, "{not json").unwrap();
        assert!(read(&bad).is_err());
        let newer = dir.join("y.hay");
        fs::write(
            &newer,
            format!(r#"{{"format":"{HAY_FORMAT}","format_version":99}}"#),
        )
        .unwrap();
        assert!(read(&newer).unwrap_err().contains("newer"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn report_renders() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let md = health_report(&conn).unwrap();
        assert!(md.starts_with("# Haysu health summary"));
    }
}
