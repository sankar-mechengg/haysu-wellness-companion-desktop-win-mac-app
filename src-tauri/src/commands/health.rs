//! Tauri commands for medicines, dose logging, conditions, diary and measurements.

use chrono::Duration;
use tauri::{AppHandle, Emitter, Manager};

use crate::config::ConfigState;
use crate::db::{time, DbState};
use crate::health::{
    self, store, AdherenceStats, Condition, ConditionInput, DiaryEntry, DiaryInput, DoseLog,
    DoseSlot, FoodEntry, FoodInput, Measurement, MeasurementInput, Medicine, MedicineInput,
    MEASUREMENT_KINDS,
};
use crate::scheduler;

pub const EV_HEALTH: &str = "health-changed";

fn with_conn<T>(
    app: &AppHandle,
    f: impl FnOnce(&rusqlite::Connection) -> Result<T, String>,
) -> Result<T, String> {
    let db = app.state::<DbState>();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    f(&conn)
}

fn notify(app: &AppHandle, what: &str) {
    let _ = app.emit(EV_HEALTH, what);
}

// ─── Medicines ─────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_medicines(app: AppHandle) -> Result<Vec<Medicine>, String> {
    with_conn(&app, store::list_medicines)
}

#[tauri::command]
pub fn save_medicine(app: AppHandle, mut input: MedicineInput) -> Result<Medicine, String> {
    input.validate()?;
    let m = with_conn(&app, |c| store::save_medicine(c, &input))?;
    scheduler::reload_medicines(&app);
    notify(&app, "medicines");
    Ok(m)
}

#[tauri::command]
pub fn delete_medicine(app: AppHandle, id: i64) -> Result<(), String> {
    with_conn(&app, |c| store::delete_medicine(c, id))?;
    scheduler::reload_medicines(&app);
    notify(&app, "medicines");
    Ok(())
}

#[tauri::command]
pub fn get_dose_schedule(app: AppHandle, date: Option<String>) -> Result<Vec<DoseSlot>, String> {
    let date = date.unwrap_or_else(time::today_local);
    if !time::is_valid_date(&date) {
        return Err("invalid date".into());
    }
    with_conn(&app, |c| store::schedule_for_date(c, &date))
}

/// Mark a dose `taken`, `skipped` or back to `pending`.
#[tauri::command]
pub fn log_dose(
    app: AppHandle,
    medicine_id: i64,
    scheduled_at: String,
    status: String,
    note: Option<String>,
) -> Result<DoseLog, String> {
    if health::parse_slot(&scheduled_at).is_none() {
        return Err("invalid slot".into());
    }
    if !["taken", "skipped", "pending"].contains(&status.as_str()) {
        return Err("status must be taken, skipped or pending".into());
    }
    let log = with_conn(&app, |c| {
        store::set_dose_status(
            c,
            medicine_id,
            &scheduled_at,
            &status,
            note.as_deref(),
            None,
        )
    })?;
    scheduler::with_state(&app, |st, _, _| {
        if status == "pending" {
            st.medicines.reopen(medicine_id, &scheduled_at);
        } else {
            st.medicines.resolve(medicine_id, &scheduled_at);
        }
    });
    scheduler::emit_snapshot(&app);
    notify(&app, "doses");
    let _ = app.emit(crate::commands::stats::EV_ACTIVITY, "medicine");
    Ok(log)
}

#[tauri::command]
pub fn snooze_dose(
    app: AppHandle,
    medicine_id: i64,
    scheduled_at: String,
    minutes: Option<u32>,
) -> Result<(), String> {
    if health::parse_slot(&scheduled_at).is_none() {
        return Err("invalid slot".into());
    }
    let cfg = app.state::<ConfigState>().get();
    let mins = minutes.unwrap_or(cfg.snooze_minutes).clamp(1, 240) as i64;
    let until = health::now_local_naive() + Duration::minutes(mins);
    let until_str = health::slot_string(until);
    with_conn(&app, |c| {
        store::set_dose_status(
            c,
            medicine_id,
            &scheduled_at,
            "snoozed",
            None,
            Some(&until_str),
        )
    })?;
    scheduler::with_state(&app, |st, _, _| {
        st.medicines.snooze(medicine_id, &scheduled_at, until)
    });
    scheduler::emit_snapshot(&app);
    notify(&app, "doses");
    Ok(())
}

#[tauri::command]
pub fn get_adherence(app: AppHandle, days: Option<i64>) -> Result<AdherenceStats, String> {
    with_conn(&app, |c| store::adherence(c, days.unwrap_or(7)))
}

// ─── Conditions ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_conditions(app: AppHandle) -> Result<Vec<Condition>, String> {
    with_conn(&app, store::list_conditions)
}

#[tauri::command]
pub fn save_condition(app: AppHandle, mut input: ConditionInput) -> Result<Condition, String> {
    input.validate()?;
    let c = with_conn(&app, |conn| store::save_condition(conn, &input))?;
    notify(&app, "conditions");
    Ok(c)
}

#[tauri::command]
pub fn delete_condition(app: AppHandle, id: i64) -> Result<(), String> {
    with_conn(&app, |c| store::delete_condition(c, id))?;
    notify(&app, "conditions");
    Ok(())
}

// ─── Diary ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_diary(app: AppHandle, from: String, to: String) -> Result<Vec<DiaryEntry>, String> {
    if !time::is_valid_date(&from) || !time::is_valid_date(&to) {
        return Err("invalid date".into());
    }
    with_conn(&app, |c| store::list_diary(c, &from, &to))
}

#[tauri::command]
pub fn save_diary_entry(app: AppHandle, mut input: DiaryInput) -> Result<DiaryEntry, String> {
    input.validate()?;
    let d = with_conn(&app, |c| store::save_diary(c, &input))?;
    notify(&app, "diary");
    let _ = app.emit(crate::commands::stats::EV_ACTIVITY, "diary");
    Ok(d)
}

#[tauri::command]
pub fn delete_diary_entry(app: AppHandle, id: i64) -> Result<(), String> {
    with_conn(&app, |c| store::delete_diary(c, id))?;
    notify(&app, "diary");
    let _ = app.emit(crate::commands::stats::EV_ACTIVITY, "diary");
    Ok(())
}

#[tauri::command]
pub fn get_symptom_suggestions(app: AppHandle) -> Result<Vec<String>, String> {
    with_conn(&app, store::symptom_suggestions)
}

// ─── Measurements ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_measurements(
    app: AppHandle,
    kind: Option<String>,
    days: Option<i64>,
) -> Result<Vec<Measurement>, String> {
    with_conn(&app, |c| {
        store::list_measurements(c, kind.as_deref(), days.unwrap_or(90))
    })
}

#[tauri::command]
pub fn add_measurement(app: AppHandle, mut input: MeasurementInput) -> Result<Measurement, String> {
    let unit = input.validate()?;
    let m = with_conn(&app, |c| store::add_measurement(c, &input, unit))?;
    // A new weight also updates the profile and the water goal.
    if m.kind == "weight" {
        let profile = with_conn(&app, |c| {
            let daily = crate::utils::water_calc::calculate_daily_water(m.value);
            c.execute(
                "UPDATE user_profile SET weight_kg = ?1, daily_water_ml = ?2, updated_at = ?3 WHERE id = 1",
                rusqlite::params![m.value, daily, time::now_utc()],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        });
        if profile.is_ok() {
            if let Ok(Some(p)) = crate::commands::user::get_user_profile(app.state::<DbState>()) {
                let _ = app.emit(crate::commands::user::EV_PROFILE, &p);
            }
        }
    }
    notify(&app, "measurements");
    Ok(m)
}

#[tauri::command]
pub fn delete_measurement(app: AppHandle, id: i64) -> Result<(), String> {
    with_conn(&app, |c| store::delete_measurement(c, id))?;
    notify(&app, "measurements");
    Ok(())
}

// ─── Food ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_food(app: AppHandle, days: Option<i64>) -> Result<Vec<FoodEntry>, String> {
    with_conn(&app, |c| store::list_food(c, days.unwrap_or(7)))
}

#[tauri::command]
pub fn add_food(app: AppHandle, mut input: FoodInput) -> Result<FoodEntry, String> {
    input.validate()?;
    let f = with_conn(&app, |c| store::add_food(c, &input))?;
    notify(&app, "food");
    let _ = app.emit(crate::commands::stats::EV_ACTIVITY, "food");
    Ok(f)
}

#[tauri::command]
pub fn delete_food(app: AppHandle, id: i64) -> Result<(), String> {
    with_conn(&app, |c| store::delete_food(c, id))?;
    notify(&app, "food");
    Ok(())
}

#[tauri::command]
pub fn measurement_kinds() -> Vec<(String, String)> {
    MEASUREMENT_KINDS
        .iter()
        .map(|(k, u)| (k.to_string(), u.to_string()))
        .collect()
}
