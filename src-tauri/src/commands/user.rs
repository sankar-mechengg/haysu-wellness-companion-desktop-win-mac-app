use tauri::{AppHandle, Emitter, Manager, State};

use crate::config::ConfigState;
use crate::db::models::UserProfile;
use crate::db::{time, DbState};
use crate::scheduler;
use crate::utils::water_calc;

pub const EV_PROFILE: &str = "profile-changed";

fn read_profile(conn: &rusqlite::Connection) -> Option<UserProfile> {
    conn.query_row(
        "SELECT id, name, age, weight_kg, height_cm, occupation, work_style, daily_water_ml,
                created_at, updated_at
         FROM user_profile WHERE id = 1",
        [],
        |row| {
            Ok(UserProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                age: row.get(2)?,
                weight_kg: row.get(3)?,
                height_cm: row.get(4)?,
                occupation: row.get(5)?,
                work_style: row.get(6)?,
                daily_water_ml: row.get(7)?,
                created_at: time::to_rfc3339(&row.get::<_, String>(8)?),
                updated_at: time::to_rfc3339(&row.get::<_, String>(9)?),
            })
        },
    )
    .ok()
}

/// Work style stored in the profile, or "sedentary" when there is none yet.
pub fn current_work_style(db: &DbState) -> String {
    db.conn
        .lock()
        .ok()
        .and_then(|c| read_profile(&c))
        .map(|p| p.work_style)
        .unwrap_or_else(|| "sedentary".into())
}

#[tauri::command]
pub fn get_user_profile(db: State<'_, DbState>) -> Result<Option<UserProfile>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    Ok(read_profile(&conn))
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn save_user_profile(
    app: AppHandle,
    name: String,
    age: i64,
    weight_kg: f64,
    height_cm: f64,
    occupation: String,
    work_style: String,
) -> Result<UserProfile, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name cannot be empty".into());
    }
    if !(1.0..=400.0).contains(&weight_kg) || !(50.0..=300.0).contains(&height_cm) {
        return Err("Weight or height is out of range".into());
    }
    if !["sedentary", "moderate", "active"].contains(&work_style.as_str()) {
        return Err("Invalid work style".into());
    }
    let daily_water_ml = water_calc::calculate_daily_water(weight_kg);

    let profile = {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO user_profile (id, name, age, weight_kg, height_cm, occupation, work_style, daily_water_ml, created_at, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name, age = excluded.age, weight_kg = excluded.weight_kg,
                height_cm = excluded.height_cm, occupation = excluded.occupation,
                work_style = excluded.work_style, daily_water_ml = excluded.daily_water_ml,
                updated_at = excluded.updated_at",
            rusqlite::params![name, age, weight_kg, height_cm, occupation, work_style, daily_water_ml, time::now_utc()],
        )
        .map_err(|e| e.to_string())?;
        read_profile(&conn).ok_or_else(|| "Failed to read back profile".to_string())?
    };

    scheduler::with_state(&app, |st, _, _| st.work_style = profile.work_style.clone());
    let _ = app.emit(EV_PROFILE, &profile);
    Ok(profile)
}

#[tauri::command]
pub fn has_completed_onboarding(app: AppHandle) -> bool {
    app.state::<ConfigState>().get().onboarding_complete
}
