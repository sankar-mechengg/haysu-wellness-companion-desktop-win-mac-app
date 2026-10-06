//! Personal care routines: anything that recurs every N days (haircut,
//! skincare, dentist, posture photo check, daily diary check-in…).

use chrono::{NaiveDate, NaiveTime};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CareRoutine {
    pub id: i64,
    pub name: String,
    pub icon: String,
    /// generic | photo_check | diary | measurement
    pub kind: String,
    pub interval_days: i64,
    /// `HH:MM`; empty = the configured default time.
    pub time_of_day: String,
    pub last_done: Option<String>,
    pub last_reminded: Option<String>,
    pub snoozed_until: Option<String>,
    pub active: bool,
    pub notes: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CareRoutineInput {
    pub id: Option<i64>,
    pub name: String,
    #[serde(default)]
    pub icon: String,
    #[serde(default = "default_kind")]
    pub kind: String,
    pub interval_days: i64,
    #[serde(default)]
    pub time_of_day: String,
    #[serde(default = "default_true")]
    pub active: bool,
    #[serde(default)]
    pub notes: String,
    pub last_done: Option<String>,
}

fn default_kind() -> String {
    "generic".into()
}
fn default_true() -> bool {
    true
}

impl CareRoutineInput {
    pub fn validate(&mut self) -> Result<(), String> {
        self.name = self.name.trim().to_string();
        if self.name.is_empty() {
            return Err("Routine name cannot be empty".into());
        }
        if !(1..=3650).contains(&self.interval_days) {
            return Err("Interval must be between 1 and 3650 days".into());
        }
        if !["generic", "photo_check", "diary", "measurement"].contains(&self.kind.as_str()) {
            self.kind = "generic".into();
        }
        if !self.time_of_day.is_empty()
            && NaiveTime::parse_from_str(&self.time_of_day, "%H:%M").is_err()
        {
            return Err("Time must be HH:MM".into());
        }
        if let Some(d) = &self.last_done {
            if d.trim().is_empty() {
                self.last_done = None;
            } else if NaiveDate::parse_from_str(d, "%Y-%m-%d").is_err() {
                return Err("Last done must be YYYY-MM-DD".into());
            }
        }
        if self.icon.trim().is_empty() {
            self.icon = "✨".into();
        }
        Ok(())
    }
}

/// Preset routines the user can add with one click.
#[derive(Debug, Clone, Serialize)]
pub struct Preset {
    pub name: &'static str,
    pub icon: &'static str,
    pub kind: &'static str,
    pub interval_days: i64,
    pub time_of_day: &'static str,
    pub notes: &'static str,
}

pub const PRESETS: &[Preset] = &[
    Preset {
        name: "Daily check-in",
        icon: "📓",
        kind: "diary",
        interval_days: 1,
        time_of_day: "20:30",
        notes: "How did today go? Mood, energy, symptoms.",
    },
    Preset {
        name: "Posture & appearance photo",
        icon: "📷",
        kind: "photo_check",
        interval_days: 7,
        time_of_day: "11:00",
        notes: "Stand or sit naturally; Haysu AI reviews posture and grooming.",
    },
    Preset {
        name: "Weigh in",
        icon: "⚖️",
        kind: "measurement",
        interval_days: 7,
        time_of_day: "08:00",
        notes: "Same time, same scale.",
    },
    Preset {
        name: "Morning skincare",
        icon: "🧴",
        kind: "generic",
        interval_days: 1,
        time_of_day: "08:00",
        notes: "Cleanse, moisturise, sunscreen.",
    },
    Preset {
        name: "Evening skincare",
        icon: "🌙",
        kind: "generic",
        interval_days: 1,
        time_of_day: "22:00",
        notes: "Cleanse and moisturise.",
    },
    Preset {
        name: "Sunscreen",
        icon: "🧴",
        kind: "generic",
        interval_days: 1,
        time_of_day: "09:00",
        notes: "",
    },
    Preset {
        name: "Haircut",
        icon: "💇",
        kind: "generic",
        interval_days: 28,
        time_of_day: "",
        notes: "",
    },
    Preset {
        name: "Beard / shave",
        icon: "🪒",
        kind: "generic",
        interval_days: 3,
        time_of_day: "08:00",
        notes: "",
    },
    Preset {
        name: "Nail trim",
        icon: "💅",
        kind: "generic",
        interval_days: 7,
        time_of_day: "",
        notes: "",
    },
    Preset {
        name: "Floss",
        icon: "🦷",
        kind: "generic",
        interval_days: 1,
        time_of_day: "22:00",
        notes: "",
    },
    Preset {
        name: "Dentist check-up",
        icon: "🦷",
        kind: "generic",
        interval_days: 180,
        time_of_day: "",
        notes: "",
    },
    Preset {
        name: "Eye test",
        icon: "👓",
        kind: "generic",
        interval_days: 365,
        time_of_day: "",
        notes: "",
    },
    Preset {
        name: "Change bed sheets",
        icon: "🛏️",
        kind: "generic",
        interval_days: 7,
        time_of_day: "",
        notes: "",
    },
    Preset {
        name: "Clean desk & screen",
        icon: "🧹",
        kind: "generic",
        interval_days: 7,
        time_of_day: "",
        notes: "",
    },
    Preset {
        name: "Replace toothbrush",
        icon: "🪥",
        kind: "generic",
        interval_days: 90,
        time_of_day: "",
        notes: "",
    },
    Preset {
        name: "Digital detox evening",
        icon: "📵",
        kind: "generic",
        interval_days: 7,
        time_of_day: "19:00",
        notes: "Screens off after this reminder.",
    },
];

/// Date a routine is next due (never done → today).
pub fn next_due(r: &CareRoutine, today: NaiveDate) -> NaiveDate {
    match r
        .last_done
        .as_deref()
        .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
    {
        Some(d) => d + chrono::Duration::days(r.interval_days),
        None => today,
    }
}

/// Routines that should fire now.
pub fn due_now<'a>(
    routines: &'a [CareRoutine],
    today: NaiveDate,
    now: NaiveTime,
    default_time: &str,
) -> Vec<&'a CareRoutine> {
    let today_s = today.format("%Y-%m-%d").to_string();
    let default_t = NaiveTime::parse_from_str(default_time, "%H:%M")
        .unwrap_or_else(|_| NaiveTime::from_hms_opt(10, 0, 0).expect("valid"));
    routines
        .iter()
        .filter(|r| r.active)
        .filter(|r| next_due(r, today) <= today)
        .filter(|r| r.last_reminded.as_deref() != Some(today_s.as_str()))
        .filter(|r| {
            r.snoozed_until
                .as_deref()
                .map(|s| s <= today_s.as_str())
                .unwrap_or(true)
        })
        .filter(|r| {
            let t = NaiveTime::parse_from_str(&r.time_of_day, "%H:%M").unwrap_or(default_t);
            now >= t
        })
        .collect()
}

pub mod store {
    use super::{CareRoutine, CareRoutineInput};
    use crate::db::time;
    use rusqlite::{params, Connection, OptionalExtension, Row};

    type R<T> = Result<T, String>;
    fn e(err: rusqlite::Error) -> String {
        err.to_string()
    }

    const COLS: &str = "id, name, icon, kind, interval_days, time_of_day, last_done, last_reminded, snoozed_until, active, notes, created_at";

    fn from_row(row: &Row) -> rusqlite::Result<CareRoutine> {
        Ok(CareRoutine {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            kind: row.get(3)?,
            interval_days: row.get(4)?,
            time_of_day: row.get(5)?,
            last_done: row.get(6)?,
            last_reminded: row.get(7)?,
            snoozed_until: row.get(8)?,
            active: row.get::<_, i64>(9)? == 1,
            notes: row.get(10)?,
            created_at: time::to_rfc3339(&row.get::<_, String>(11)?),
        })
    }

    pub fn list(conn: &Connection) -> R<Vec<CareRoutine>> {
        let mut stmt = conn
            .prepare(&format!(
                "SELECT {COLS} FROM care_routines ORDER BY active DESC, interval_days, name COLLATE NOCASE"
            ))
            .map_err(e)?;
        let rows = stmt
            .query_map([], from_row)
            .map_err(e)?
            .filter_map(Result::ok)
            .collect();
        Ok(rows)
    }

    pub fn get(conn: &Connection, id: i64) -> R<Option<CareRoutine>> {
        conn.query_row(
            &format!("SELECT {COLS} FROM care_routines WHERE id = ?1"),
            [id],
            from_row,
        )
        .optional()
        .map_err(e)
    }

    pub fn save(conn: &Connection, input: &CareRoutineInput) -> R<CareRoutine> {
        let id = match input.id {
            Some(id) => {
                let n = conn
                    .execute(
                        "UPDATE care_routines SET name=?1, icon=?2, kind=?3, interval_days=?4, time_of_day=?5,
                         active=?6, notes=?7, last_done=COALESCE(?8, last_done) WHERE id=?9",
                        params![
                            input.name,
                            input.icon,
                            input.kind,
                            input.interval_days,
                            input.time_of_day,
                            input.active as i64,
                            input.notes,
                            input.last_done,
                            id
                        ],
                    )
                    .map_err(e)?;
                if n == 0 {
                    return Err("Routine not found".into());
                }
                id
            }
            None => {
                conn.execute(
                    "INSERT INTO care_routines (name, icon, kind, interval_days, time_of_day, active, notes, last_done, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    params![
                        input.name,
                        input.icon,
                        input.kind,
                        input.interval_days,
                        input.time_of_day,
                        input.active as i64,
                        input.notes,
                        input.last_done,
                        time::now_utc()
                    ],
                )
                .map_err(e)?;
                conn.last_insert_rowid()
            }
        };
        get(conn, id)?.ok_or_else(|| "routine vanished".into())
    }

    pub fn delete(conn: &Connection, id: i64) -> R<()> {
        conn.execute("DELETE FROM care_routines WHERE id = ?1", [id])
            .map_err(e)?;
        Ok(())
    }

    pub fn mark_done(conn: &Connection, id: i64, date: &str) -> R<()> {
        conn.execute(
            "UPDATE care_routines SET last_done = ?1, snoozed_until = NULL WHERE id = ?2",
            params![date, id],
        )
        .map_err(e)?;
        Ok(())
    }

    pub fn mark_reminded(conn: &Connection, id: i64, date: &str) -> R<()> {
        conn.execute(
            "UPDATE care_routines SET last_reminded = ?1 WHERE id = ?2",
            params![date, id],
        )
        .map_err(e)?;
        Ok(())
    }

    pub fn snooze_until(conn: &Connection, id: i64, date: &str) -> R<()> {
        conn.execute(
            "UPDATE care_routines SET snoozed_until = ?1 WHERE id = ?2",
            params![date, id],
        )
        .map_err(e)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn routine(id: i64, interval: i64, last_done: Option<&str>, time: &str) -> CareRoutine {
        CareRoutine {
            id,
            name: format!("r{id}"),
            icon: "x".into(),
            kind: "generic".into(),
            interval_days: interval,
            time_of_day: time.into(),
            last_done: last_done.map(|s| s.to_string()),
            last_reminded: None,
            snoozed_until: None,
            active: true,
            notes: String::new(),
            created_at: String::new(),
        }
    }

    fn d(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }
    fn t(h: u32, m: u32) -> NaiveTime {
        NaiveTime::from_hms_opt(h, m, 0).unwrap()
    }

    #[test]
    fn due_logic() {
        let rs = vec![
            routine(1, 7, Some("2026-03-01"), ""),       // due 03-08
            routine(2, 7, Some("2026-03-10"), ""),       // due 03-17
            routine(3, 1, None, "20:30"),                // never done → today after 20:30
            routine(4, 30, Some("2026-01-01"), "09:00"), // overdue
        ];
        let today = d("2026-03-11");
        let ids = |v: Vec<&CareRoutine>| v.iter().map(|r| r.id).collect::<Vec<_>>();
        assert_eq!(ids(due_now(&rs, today, t(10, 0), "10:00")), vec![1, 4]);
        assert_eq!(ids(due_now(&rs, today, t(9, 0), "10:00")), vec![4]);
        assert_eq!(ids(due_now(&rs, today, t(21, 0), "10:00")), vec![1, 3, 4]);
    }

    #[test]
    fn reminded_and_snoozed_are_skipped() {
        let mut r = routine(1, 7, Some("2026-03-01"), "");
        let today = d("2026-03-11");
        r.last_reminded = Some("2026-03-11".into());
        assert!(due_now(std::slice::from_ref(&r), today, t(12, 0), "10:00").is_empty());
        r.last_reminded = None;
        r.snoozed_until = Some("2026-03-12".into());
        assert!(due_now(std::slice::from_ref(&r), today, t(12, 0), "10:00").is_empty());
        r.snoozed_until = Some("2026-03-11".into());
        assert_eq!(
            due_now(std::slice::from_ref(&r), today, t(12, 0), "10:00").len(),
            1
        );
        r.active = false;
        assert!(due_now(std::slice::from_ref(&r), today, t(12, 0), "10:00").is_empty());
    }

    #[test]
    fn validation() {
        let mut i = CareRoutineInput {
            id: None,
            name: " Haircut ".into(),
            icon: String::new(),
            kind: "weird".into(),
            interval_days: 28,
            time_of_day: String::new(),
            active: true,
            notes: String::new(),
            last_done: Some("".into()),
        };
        i.validate().unwrap();
        assert_eq!(i.name, "Haircut");
        assert_eq!(i.kind, "generic");
        assert_eq!(i.icon, "✨");
        assert_eq!(i.last_done, None);
        i.interval_days = 0;
        assert!(i.validate().is_err());
    }
}
