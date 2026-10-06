//! Personal care routine commands.

use tauri::{AppHandle, Emitter, Manager};

use crate::care::{self, store, CareRoutine, CareRoutineInput, Preset};
use crate::db::{time, DbState};
use crate::scheduler;

pub const EV_CARE: &str = "care-changed";

fn with_conn<T>(
    app: &AppHandle,
    f: impl FnOnce(&rusqlite::Connection) -> Result<T, String>,
) -> Result<T, String> {
    let db = app.state::<DbState>();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    f(&conn)
}

fn changed(app: &AppHandle) {
    scheduler::reload_care(app);
    let _ = app.emit(EV_CARE, ());
}

#[tauri::command]
pub fn care_list(app: AppHandle) -> Result<Vec<CareRoutine>, String> {
    with_conn(&app, store::list)
}

#[tauri::command]
pub fn care_presets() -> Vec<Preset> {
    care::PRESETS.to_vec()
}

#[tauri::command]
pub fn care_save(app: AppHandle, mut input: CareRoutineInput) -> Result<CareRoutine, String> {
    input.validate()?;
    let r = with_conn(&app, |c| store::save(c, &input))?;
    changed(&app);
    Ok(r)
}

#[tauri::command]
pub fn care_add_preset(app: AppHandle, name: String) -> Result<CareRoutine, String> {
    let p = care::PRESETS
        .iter()
        .find(|p| p.name == name)
        .ok_or_else(|| "Unknown preset".to_string())?;
    let mut input = CareRoutineInput {
        id: None,
        name: p.name.into(),
        icon: p.icon.into(),
        kind: p.kind.into(),
        interval_days: p.interval_days,
        time_of_day: p.time_of_day.into(),
        active: true,
        notes: p.notes.into(),
        // Daily routines start tomorrow rather than nagging immediately.
        last_done: if p.interval_days == 1 {
            Some(time::today_local())
        } else {
            None
        },
    };
    input.validate()?;
    // Adding the same preset twice just returns the existing routine.
    if let Some(existing) = with_conn(&app, store::list)?
        .into_iter()
        .find(|r| r.name.eq_ignore_ascii_case(&input.name))
    {
        return Ok(existing);
    }
    let r = with_conn(&app, |c| store::save(c, &input))?;
    changed(&app);
    Ok(r)
}

#[tauri::command]
pub fn care_delete(app: AppHandle, id: i64) -> Result<(), String> {
    with_conn(&app, |c| store::delete(c, id))?;
    changed(&app);
    Ok(())
}

/// Mark done today (or on `date`).
#[tauri::command]
pub fn care_done(app: AppHandle, id: i64, date: Option<String>) -> Result<(), String> {
    let d = date.unwrap_or_else(time::today_local);
    if !time::is_valid_date(&d) {
        return Err("invalid date".into());
    }
    with_conn(&app, |c| store::mark_done(c, id, &d))?;
    changed(&app);
    let _ = app.emit(crate::commands::stats::EV_ACTIVITY, "care");
    Ok(())
}

/// Push the next reminder to tomorrow (or `days` ahead).
#[tauri::command]
pub fn care_snooze(app: AppHandle, id: i64, days: Option<i64>) -> Result<(), String> {
    let until = time::add_days(&time::today_local(), days.unwrap_or(1).clamp(1, 30));
    with_conn(&app, |c| store::snooze_until(c, id, &until))?;
    changed(&app);
    Ok(())
}
