use tauri::State;
use crate::db::init::DbState;
use crate::db::models::UserProfile;
use crate::utils::water_calc;

#[tauri::command]
pub fn get_user_profile(db: State<'_, DbState>) -> Result<Option<UserProfile>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, age, weight_kg, height_cm, occupation, work_style, daily_water_ml, created_at, updated_at FROM user_profile WHERE id = 1")
        .map_err(|e| e.to_string())?;

    let profile = stmt
        .query_row([], |row| {
            Ok(UserProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                age: row.get(2)?,
                weight_kg: row.get(3)?,
                height_cm: row.get(4)?,
                occupation: row.get(5)?,
                work_style: row.get(6)?,
                daily_water_ml: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .ok();

    Ok(profile)
}

#[tauri::command]
pub fn save_user_profile(
    db: State<'_, DbState>,
    name: String,
    age: i64,
    weight_kg: f64,
    height_cm: f64,
    occupation: String,
    work_style: String,
) -> Result<UserProfile, String> {
    let daily_water_ml = water_calc::calculate_daily_water(weight_kg);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO user_profile (id, name, age, weight_kg, height_cm, occupation, work_style, daily_water_ml, updated_at)
         VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
            name = ?1, age = ?2, weight_kg = ?3, height_cm = ?4,
            occupation = ?5, work_style = ?6, daily_water_ml = ?7,
            updated_at = CURRENT_TIMESTAMP",
        rusqlite::params![name, age, weight_kg, height_cm, occupation, work_style, daily_water_ml],
    )
    .map_err(|e| e.to_string())?;

    // Return the saved profile
    drop(conn);
    get_user_profile(db)
        .and_then(|opt| opt.ok_or_else(|| "Failed to retrieve saved profile".to_string()))
}

#[tauri::command]
pub fn update_user_profile(
    db: State<'_, DbState>,
    name: String,
    age: i64,
    weight_kg: f64,
    height_cm: f64,
    occupation: String,
    work_style: String,
) -> Result<UserProfile, String> {
    save_user_profile(db, name, age, weight_kg, height_cm, occupation, work_style)
}

#[tauri::command]
pub fn has_completed_onboarding(db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let value: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'onboarding_complete'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "false".to_string());
    Ok(value == "true")
}
