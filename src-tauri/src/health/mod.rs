//! Health module: medicines with dose reminders, conditions, diary entries and
//! body measurements. Pure scheduling logic lives here; SQL lives in `store`.

pub mod store;

use std::collections::{HashMap, HashSet};

use chrono::{DateTime, Datelike, Duration, Local, NaiveDate, NaiveDateTime, NaiveTime};
use serde::{Deserialize, Serialize};

/// Local wall-clock slot format for dose schedules.
pub const SLOT_FMT: &str = "%Y-%m-%d %H:%M";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Medicine {
    pub id: i64,
    pub name: String,
    pub dose: String,
    pub instructions: String,
    /// `HH:MM`, local time.
    pub times: Vec<String>,
    /// ISO weekdays, Monday = 1 … Sunday = 7.
    pub days: Vec<u8>,
    pub active: bool,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub color: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MedicineInput {
    pub id: Option<i64>,
    pub name: String,
    #[serde(default)]
    pub dose: String,
    #[serde(default)]
    pub instructions: String,
    pub times: Vec<String>,
    pub days: Vec<u8>,
    #[serde(default = "default_true")]
    pub active: bool,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    #[serde(default)]
    pub color: String,
}

fn default_true() -> bool {
    true
}

impl MedicineInput {
    pub fn validate(&mut self) -> Result<(), String> {
        self.name = self.name.trim().to_string();
        if self.name.is_empty() {
            return Err("Medicine name cannot be empty".into());
        }
        if self.name.chars().count() > 80 {
            return Err("Medicine name is too long".into());
        }
        self.times
            .retain(|t| NaiveTime::parse_from_str(t, "%H:%M").is_ok());
        self.times.sort();
        self.times.dedup();
        if self.times.is_empty() {
            return Err("Add at least one time of day".into());
        }
        self.days.retain(|d| (1..=7).contains(d));
        self.days.sort_unstable();
        self.days.dedup();
        if self.days.is_empty() {
            return Err("Pick at least one day".into());
        }
        for d in [&mut self.start_date, &mut self.end_date] {
            if let Some(s) = d {
                if s.trim().is_empty() {
                    *d = None;
                } else if NaiveDate::parse_from_str(s, "%Y-%m-%d").is_err() {
                    return Err(format!("Invalid date: {s}"));
                }
            }
        }
        if self.color.trim().is_empty() {
            self.color = "#3b93f7".into();
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DoseLog {
    pub id: i64,
    pub medicine_id: i64,
    /// Local slot, `YYYY-MM-DD HH:MM`.
    pub scheduled_at: String,
    /// pending | snoozed | taken | skipped | missed
    pub status: String,
    pub taken_at: Option<String>,
    pub snoozed_until: Option<String>,
    pub note: String,
}

/// One row of the daily schedule view.
#[derive(Debug, Clone, Serialize)]
pub struct DoseSlot {
    pub medicine_id: i64,
    pub name: String,
    pub dose: String,
    pub instructions: String,
    pub color: String,
    pub scheduled_at: String,
    pub status: String,
    pub taken_at: Option<String>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct AdherenceStats {
    pub days: i64,
    pub scheduled: i64,
    pub taken: i64,
    pub skipped: i64,
    pub missed: i64,
    pub pending: i64,
    pub adherence_pct: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Condition {
    pub id: i64,
    pub name: String,
    pub notes: String,
    /// 1 (mild) … 5 (severe)
    pub severity: i64,
    /// active | resolved
    pub status: String,
    pub started_on: Option<String>,
    pub resolved_on: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConditionInput {
    pub id: Option<i64>,
    pub name: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default = "default_severity")]
    pub severity: i64,
    #[serde(default = "default_status")]
    pub status: String,
    pub started_on: Option<String>,
    pub resolved_on: Option<String>,
}

fn default_severity() -> i64 {
    2
}
fn default_status() -> String {
    "active".into()
}

impl ConditionInput {
    pub fn validate(&mut self) -> Result<(), String> {
        self.name = self.name.trim().to_string();
        if self.name.is_empty() {
            return Err("Condition name cannot be empty".into());
        }
        self.severity = self.severity.clamp(1, 5);
        if !["active", "resolved"].contains(&self.status.as_str()) {
            return Err("Invalid status".into());
        }
        for d in [&mut self.started_on, &mut self.resolved_on] {
            if let Some(s) = d {
                if s.trim().is_empty() {
                    *d = None;
                } else if NaiveDate::parse_from_str(s, "%Y-%m-%d").is_err() {
                    return Err(format!("Invalid date: {s}"));
                }
            }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DiaryEntry {
    pub id: i64,
    /// RFC 3339 UTC.
    pub timestamp: String,
    /// Local calendar date the entry belongs to.
    pub date: String,
    pub mood: Option<i64>,
    pub energy: Option<i64>,
    pub sleep_hours: Option<f64>,
    pub pain: Option<i64>,
    pub symptoms: Vec<String>,
    pub notes: String,
    pub condition_id: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DiaryInput {
    pub id: Option<i64>,
    /// Optional RFC 3339 timestamp; defaults to now.
    pub timestamp: Option<String>,
    pub mood: Option<i64>,
    pub energy: Option<i64>,
    pub sleep_hours: Option<f64>,
    pub pain: Option<i64>,
    #[serde(default)]
    pub symptoms: Vec<String>,
    #[serde(default)]
    pub notes: String,
    pub condition_id: Option<i64>,
}

impl DiaryInput {
    pub fn validate(&mut self) -> Result<(), String> {
        self.mood = self.mood.map(|m| m.clamp(1, 5));
        self.energy = self.energy.map(|m| m.clamp(1, 5));
        self.pain = self.pain.map(|m| m.clamp(0, 10));
        self.sleep_hours = self.sleep_hours.map(|h| h.clamp(0.0, 24.0));
        self.symptoms = self
            .symptoms
            .iter()
            .map(|s| s.trim().to_lowercase())
            .filter(|s| !s.is_empty())
            .collect();
        self.symptoms.dedup();
        self.notes = self.notes.trim().to_string();
        if self.notes.chars().count() > 4000 {
            return Err("Notes are too long".into());
        }
        if self.mood.is_none()
            && self.energy.is_none()
            && self.pain.is_none()
            && self.sleep_hours.is_none()
            && self.symptoms.is_empty()
            && self.notes.is_empty()
        {
            return Err("Add at least one detail to the entry".into());
        }
        if let Some(ts) = &self.timestamp {
            DateTime::parse_from_rfc3339(ts).map_err(|_| "Invalid timestamp".to_string())?;
        }
        Ok(())
    }
}

pub const MEASUREMENT_KINDS: &[(&str, &str)] = &[
    ("weight", "kg"),
    ("blood_pressure", "mmHg"),
    ("heart_rate", "bpm"),
    ("temperature", "°C"),
    ("glucose", "mg/dL"),
    ("spo2", "%"),
];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Measurement {
    pub id: i64,
    pub kind: String,
    pub value: f64,
    /// Diastolic for blood pressure.
    pub value2: Option<f64>,
    pub unit: String,
    /// RFC 3339 UTC.
    pub measured_at: String,
    pub notes: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MeasurementInput {
    pub kind: String,
    pub value: f64,
    pub value2: Option<f64>,
    pub measured_at: Option<String>,
    #[serde(default)]
    pub notes: String,
}

impl MeasurementInput {
    pub fn validate(&mut self) -> Result<&'static str, String> {
        let Some((_, unit)) = MEASUREMENT_KINDS.iter().find(|(k, _)| *k == self.kind) else {
            return Err(format!("Unknown measurement kind: {}", self.kind));
        };
        if !self.value.is_finite() || self.value <= 0.0 || self.value > 100_000.0 {
            return Err("Value is out of range".into());
        }
        if self.kind == "blood_pressure" && self.value2.is_none() {
            return Err("Blood pressure needs a diastolic value".into());
        }
        if self.kind != "blood_pressure" {
            self.value2 = None;
        }
        if let Some(ts) = &self.measured_at {
            DateTime::parse_from_rfc3339(ts).map_err(|_| "Invalid timestamp".to_string())?;
        }
        Ok(unit)
    }
}

// ─── Pure scheduling ───────────────────────────────────────────────────────

/// Dose slots a medicine produces on `date`.
pub fn slots_for_date(meds: &[Medicine], date: NaiveDate) -> Vec<(i64, NaiveDateTime)> {
    let weekday = date.weekday().number_from_monday() as u8;
    let date_str = date.format("%Y-%m-%d").to_string();
    let mut out = Vec::new();
    for m in meds.iter().filter(|m| m.active) {
        if !m.days.contains(&weekday) {
            continue;
        }
        if let Some(s) = &m.start_date {
            if date_str.as_str() < s.as_str() {
                continue;
            }
        }
        if let Some(e) = &m.end_date {
            if date_str.as_str() > e.as_str() {
                continue;
            }
        }
        for t in &m.times {
            if let Ok(time) = NaiveTime::parse_from_str(t, "%H:%M") {
                out.push((m.id, date.and_time(time)));
            }
        }
    }
    out.sort_by(|a, b| a.1.cmp(&b.1).then(a.0.cmp(&b.0)));
    out
}

pub fn slot_string(dt: NaiveDateTime) -> String {
    dt.format(SLOT_FMT).to_string()
}

pub fn parse_slot(s: &str) -> Option<NaiveDateTime> {
    NaiveDateTime::parse_from_str(s, SLOT_FMT).ok()
}

/// Events produced by [`MedicineTracker::tick`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MedEvent {
    /// Time to take a dose. `first` is false when this is a snooze re-fire.
    Due {
        medicine_id: i64,
        scheduled_at: String,
        first: bool,
    },
    /// A pending dose was never answered within the grace window.
    Missed {
        medicine_id: i64,
        scheduled_at: String,
    },
}

/// In-memory view of today's doses, driven by the scheduler tick.
#[derive(Debug, Default)]
pub struct MedicineTracker {
    pub medicines: Vec<Medicine>,
    day: Option<NaiveDate>,
    /// Unanswered doses → when to (re)fire. A far-future value means "already
    /// shown, waiting for the user".
    pending: HashMap<(i64, String), NaiveDateTime>,
    /// Doses with a final status today.
    done: HashSet<(i64, String)>,
}

fn far_future() -> NaiveDateTime {
    NaiveDate::from_ymd_opt(9999, 1, 1)
        .and_then(|d| d.and_hms_opt(0, 0, 0))
        .expect("valid date")
}

impl MedicineTracker {
    /// Rebuild from the current medicine list and today's log rows.
    pub fn reload(&mut self, medicines: Vec<Medicine>, today_logs: &[DoseLog], now: NaiveDateTime) {
        self.medicines = medicines;
        self.day = Some(now.date());
        self.pending.clear();
        self.done.clear();
        for log in today_logs {
            let key = (log.medicine_id, log.scheduled_at.clone());
            match log.status.as_str() {
                "taken" | "skipped" | "missed" => {
                    self.done.insert(key);
                }
                "snoozed" => {
                    let until = log
                        .snoozed_until
                        .as_deref()
                        .and_then(parse_slot)
                        .unwrap_or(now);
                    self.pending.insert(key, until);
                }
                _ => {
                    // Unanswered before a restart: ask again right away.
                    self.pending.insert(key, now);
                }
            }
        }
    }

    /// Advance to `now`. `allowed` is false while reminders are suppressed
    /// (DND etc.) and medicine reminders do not override it.
    pub fn tick(
        &mut self,
        now: NaiveDateTime,
        allowed: bool,
        missed_after: Duration,
    ) -> Vec<MedEvent> {
        let mut events = Vec::new();
        if self.day != Some(now.date()) {
            self.day = Some(now.date());
            self.pending.clear();
            self.done.clear();
        }
        for (medicine_id, slot) in slots_for_date(&self.medicines, now.date()) {
            if slot > now {
                continue;
            }
            let key = (medicine_id, slot_string(slot));
            if self.done.contains(&key) {
                continue;
            }
            let overdue = now - slot > missed_after;
            match self.pending.get(&key).copied() {
                Some(next_fire) => {
                    if overdue {
                        self.pending.remove(&key);
                        self.done.insert(key.clone());
                        events.push(MedEvent::Missed {
                            medicine_id,
                            scheduled_at: key.1,
                        });
                    } else if allowed && next_fire <= now {
                        self.pending.insert(key.clone(), far_future());
                        events.push(MedEvent::Due {
                            medicine_id,
                            scheduled_at: key.1,
                            first: false,
                        });
                    }
                }
                None => {
                    if overdue {
                        // Slot passed long ago (app was closed); record, don't nag.
                        self.done.insert(key.clone());
                        events.push(MedEvent::Missed {
                            medicine_id,
                            scheduled_at: key.1,
                        });
                    } else if allowed {
                        self.pending.insert(key.clone(), far_future());
                        events.push(MedEvent::Due {
                            medicine_id,
                            scheduled_at: key.1,
                            first: true,
                        });
                    } else {
                        // Keep it pending; fire as soon as reminders are allowed.
                        self.pending.insert(key, now);
                    }
                }
            }
        }
        events
    }

    pub fn snooze(&mut self, medicine_id: i64, scheduled_at: &str, until: NaiveDateTime) {
        let key = (medicine_id, scheduled_at.to_string());
        if !self.done.contains(&key) {
            self.pending.insert(key, until);
        }
    }

    pub fn resolve(&mut self, medicine_id: i64, scheduled_at: &str) {
        let key = (medicine_id, scheduled_at.to_string());
        self.pending.remove(&key);
        self.done.insert(key);
    }

    /// Reopen a dose (user undid "taken").
    pub fn reopen(&mut self, medicine_id: i64, scheduled_at: &str) {
        let key = (medicine_id, scheduled_at.to_string());
        self.done.remove(&key);
        self.pending.insert(key, far_future());
    }

    pub fn pending_count(&self) -> usize {
        self.pending.len()
    }

    /// The most relevant dose right now: the earliest unanswered one, else the
    /// next upcoming slot today.
    pub fn next_dose(&self, now: NaiveDateTime) -> Option<NextDose> {
        let mut best: Option<NextDose> = None;
        for (medicine_id, slot) in slots_for_date(&self.medicines, now.date()) {
            let key = (medicine_id, slot_string(slot));
            if self.done.contains(&key) {
                continue;
            }
            let overdue = slot <= now;
            let Some(m) = self.medicines.iter().find(|m| m.id == medicine_id) else {
                continue;
            };
            let candidate = NextDose {
                medicine_id,
                name: m.name.clone(),
                dose: m.dose.clone(),
                scheduled_at: key.1,
                overdue,
            };
            match &best {
                None => best = Some(candidate),
                Some(b) => {
                    // Overdue beats upcoming; otherwise earliest wins (already sorted).
                    if overdue && !b.overdue {
                        best = Some(candidate);
                    }
                }
            }
            if best.as_ref().map(|b| b.overdue).unwrap_or(false) {
                break;
            }
        }
        best
    }
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct NextDose {
    pub medicine_id: i64,
    pub name: String,
    pub dose: String,
    pub scheduled_at: String,
    pub overdue: bool,
}

pub fn now_local_naive() -> NaiveDateTime {
    Local::now().naive_local()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn med(id: i64, times: &[&str], days: &[u8]) -> Medicine {
        Medicine {
            id,
            name: format!("Med {id}"),
            dose: "1 tablet".into(),
            instructions: String::new(),
            times: times.iter().map(|s| s.to_string()).collect(),
            days: days.to_vec(),
            active: true,
            start_date: None,
            end_date: None,
            color: "#000".into(),
            created_at: String::new(),
        }
    }

    fn at(h: u32, m: u32) -> NaiveDateTime {
        // 11 March 2026 is a Wednesday.
        NaiveDate::from_ymd_opt(2026, 3, 11)
            .unwrap()
            .and_hms_opt(h, m, 0)
            .unwrap()
    }

    #[test]
    fn slots_respect_days_and_dates() {
        let mut m = med(1, &["08:00", "20:00"], &[1, 2, 3, 4, 5]);
        let wed = at(0, 0).date();
        assert_eq!(slots_for_date(&[m.clone()], wed).len(), 2);
        let sat = NaiveDate::from_ymd_opt(2026, 3, 14).unwrap();
        assert!(slots_for_date(&[m.clone()], sat).is_empty());
        m.end_date = Some("2026-03-10".into());
        assert!(slots_for_date(&[m.clone()], wed).is_empty());
        m.end_date = None;
        m.active = false;
        assert!(slots_for_date(&[m], wed).is_empty());
    }

    #[test]
    fn fires_once_then_waits_for_user() {
        let mut t = MedicineTracker::default();
        t.reload(
            vec![med(1, &["08:00"], &[1, 2, 3, 4, 5, 6, 7])],
            &[],
            at(7, 0),
        );
        assert!(t.tick(at(7, 59), true, Duration::hours(2)).is_empty());
        let ev = t.tick(at(8, 0), true, Duration::hours(2));
        assert_eq!(
            ev,
            vec![MedEvent::Due {
                medicine_id: 1,
                scheduled_at: "2026-03-11 08:00".into(),
                first: true
            }]
        );
        assert!(t.tick(at(8, 1), true, Duration::hours(2)).is_empty());
        assert_eq!(t.pending_count(), 1);
    }

    #[test]
    fn snooze_refires_and_resolve_closes() {
        let mut t = MedicineTracker::default();
        t.reload(vec![med(1, &["08:00"], &[3])], &[], at(7, 0));
        t.tick(at(8, 0), true, Duration::hours(2));
        t.snooze(1, "2026-03-11 08:00", at(8, 10));
        assert!(t.tick(at(8, 5), true, Duration::hours(2)).is_empty());
        let ev = t.tick(at(8, 10), true, Duration::hours(2));
        assert!(matches!(ev[0], MedEvent::Due { first: false, .. }));
        t.resolve(1, "2026-03-11 08:00");
        assert!(t.tick(at(8, 20), true, Duration::hours(2)).is_empty());
        assert_eq!(t.pending_count(), 0);
        assert!(t.next_dose(at(8, 20)).is_none());
    }

    #[test]
    fn unanswered_dose_becomes_missed() {
        let mut t = MedicineTracker::default();
        t.reload(vec![med(1, &["08:00"], &[3])], &[], at(7, 0));
        t.tick(at(8, 0), true, Duration::hours(2));
        let ev = t.tick(at(10, 1), true, Duration::hours(2));
        assert_eq!(
            ev,
            vec![MedEvent::Missed {
                medicine_id: 1,
                scheduled_at: "2026-03-11 08:00".into()
            }]
        );
    }

    #[test]
    fn slot_long_past_at_startup_is_missed_without_popup() {
        let mut t = MedicineTracker::default();
        t.reload(vec![med(1, &["08:00"], &[3])], &[], at(23, 0));
        let ev = t.tick(at(23, 0), true, Duration::hours(2));
        assert!(matches!(ev[0], MedEvent::Missed { .. }));
    }

    #[test]
    fn suppressed_doses_fire_when_allowed_again() {
        let mut t = MedicineTracker::default();
        t.reload(vec![med(1, &["08:00"], &[3])], &[], at(7, 0));
        assert!(t.tick(at(8, 0), false, Duration::hours(2)).is_empty());
        let ev = t.tick(at(8, 30), true, Duration::hours(2));
        assert!(matches!(ev[0], MedEvent::Due { first: false, .. }));
    }

    #[test]
    fn reload_restores_log_state() {
        let mut t = MedicineTracker::default();
        let logs = vec![
            DoseLog {
                id: 1,
                medicine_id: 1,
                scheduled_at: "2026-03-11 08:00".into(),
                status: "taken".into(),
                taken_at: None,
                snoozed_until: None,
                note: String::new(),
            },
            DoseLog {
                id: 2,
                medicine_id: 1,
                scheduled_at: "2026-03-11 12:00".into(),
                status: "pending".into(),
                taken_at: None,
                snoozed_until: None,
                note: String::new(),
            },
        ];
        t.reload(
            vec![med(1, &["08:00", "12:00", "20:00"], &[3])],
            &logs,
            at(13, 0),
        );
        let ev = t.tick(at(13, 0), true, Duration::hours(2));
        // 08:00 taken → nothing; 12:00 pending → re-fires; 20:00 not yet.
        assert_eq!(ev.len(), 1);
        assert!(matches!(ev[0], MedEvent::Due { first: false, .. }));
        let next = t.next_dose(at(13, 0)).unwrap();
        assert_eq!(next.scheduled_at, "2026-03-11 12:00");
        assert!(next.overdue);
    }

    #[test]
    fn next_dose_prefers_upcoming_when_nothing_overdue() {
        let mut t = MedicineTracker::default();
        t.reload(vec![med(1, &["08:00", "20:00"], &[3])], &[], at(7, 0));
        t.tick(at(8, 0), true, Duration::hours(2));
        t.resolve(1, "2026-03-11 08:00");
        let next = t.next_dose(at(9, 0)).unwrap();
        assert_eq!(next.scheduled_at, "2026-03-11 20:00");
        assert!(!next.overdue);
    }

    #[test]
    fn input_validation() {
        let mut m = MedicineInput {
            id: None,
            name: "  Metformin ".into(),
            dose: "500 mg".into(),
            instructions: String::new(),
            times: vec!["20:00".into(), "08:00".into(), "bad".into(), "08:00".into()],
            days: vec![9, 1, 1],
            active: true,
            start_date: Some("".into()),
            end_date: None,
            color: String::new(),
        };
        m.validate().unwrap();
        assert_eq!(m.name, "Metformin");
        assert_eq!(m.times, vec!["08:00", "20:00"]);
        assert_eq!(m.days, vec![1]);
        assert_eq!(m.start_date, None);
        assert!(!m.color.is_empty());

        let mut d = DiaryInput {
            id: None,
            timestamp: None,
            mood: Some(9),
            energy: None,
            sleep_hours: None,
            pain: None,
            symptoms: vec![" Headache ".into(), "".into()],
            notes: String::new(),
            condition_id: None,
        };
        d.validate().unwrap();
        assert_eq!(d.mood, Some(5));
        assert_eq!(d.symptoms, vec!["headache"]);
    }
}
