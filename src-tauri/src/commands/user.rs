use rusqlite::Connection;
use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::config::ConfigState;
use crate::db::models::UserProfile;
use crate::db::{time, DbState};
use crate::scheduler;
use crate::utils::water_calc;

pub const EV_PROFILE: &str = "profile-changed";

const COLS: &str = "id, name, age, weight_kg, height_cm, occupation, work_style, daily_water_ml,
    created_at, updated_at, gender, diet, diet_notes, cuisines, health_goal, dress_style,
    wardrobe_notes, about_me";

pub fn read_profile(conn: &Connection) -> Option<UserProfile> {
    conn.query_row(
        &format!("SELECT {COLS} FROM user_profile WHERE id = 1"),
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
                gender: row.get(10)?,
                diet: row.get(11)?,
                diet_notes: row.get(12)?,
                cuisines: row.get(13)?,
                health_goal: row.get(14)?,
                dress_style: row.get(15)?,
                wardrobe_notes: row.get(16)?,
                about_me: row.get(17)?,
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

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct ProfileInput {
    pub name: String,
    pub age: i64,
    pub weight_kg: f64,
    pub height_cm: f64,
    pub occupation: String,
    pub work_style: String,
    pub gender: String,
    pub diet: String,
    pub diet_notes: String,
    pub cuisines: String,
    pub health_goal: String,
    pub dress_style: String,
    pub wardrobe_notes: String,
    pub about_me: String,
}

impl Default for ProfileInput {
    fn default() -> Self {
        Self {
            name: String::new(),
            age: 0,
            weight_kg: 70.0,
            height_cm: 170.0,
            occupation: String::new(),
            work_style: "sedentary".into(),
            gender: String::new(),
            diet: String::new(),
            diet_notes: String::new(),
            cuisines: String::new(),
            health_goal: String::new(),
            dress_style: String::new(),
            wardrobe_notes: String::new(),
            about_me: String::new(),
        }
    }
}

pub const DIETS: &[&str] = &[
    "",
    "non_vegetarian",
    "vegetarian",
    "vegan",
    "eggetarian",
    "pescatarian",
    "other",
];
pub const GOALS: &[&str] = &[
    "",
    "maintain",
    "lose_weight",
    "gain_weight",
    "build_strength",
    "more_energy",
    "better_sleep",
    "manage_condition",
];
pub const DRESS_STYLES: &[&str] = &[
    "",
    "casual",
    "smart_casual",
    "business",
    "formal",
    "sporty",
    "traditional",
    "other",
];

impl ProfileInput {
    fn validate(&mut self) -> Result<(), String> {
        self.name = self.name.trim().to_string();
        if self.name.is_empty() {
            return Err("Name cannot be empty".into());
        }
        if !(1.0..=400.0).contains(&self.weight_kg) || !(50.0..=300.0).contains(&self.height_cm) {
            return Err("Weight or height is out of range".into());
        }
        if !["sedentary", "moderate", "active"].contains(&self.work_style.as_str()) {
            return Err("Invalid work style".into());
        }
        if !DIETS.contains(&self.diet.as_str()) {
            return Err("Invalid diet".into());
        }
        if !GOALS.contains(&self.health_goal.as_str()) {
            return Err("Invalid goal".into());
        }
        if !DRESS_STYLES.contains(&self.dress_style.as_str()) {
            return Err("Invalid dress style".into());
        }
        for f in [
            &mut self.occupation,
            &mut self.gender,
            &mut self.diet_notes,
            &mut self.cuisines,
            &mut self.wardrobe_notes,
            &mut self.about_me,
        ] {
            *f = f.trim().chars().take(2000).collect();
        }
        self.age = self.age.clamp(0, 130);
        Ok(())
    }
}

#[tauri::command]
pub fn get_user_profile(db: State<'_, DbState>) -> Result<Option<UserProfile>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    Ok(read_profile(&conn))
}

#[tauri::command]
pub fn save_user_profile(app: AppHandle, mut input: ProfileInput) -> Result<UserProfile, String> {
    input.validate()?;
    let daily_water_ml = water_calc::calculate_daily_water(input.weight_kg);

    let profile = {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO user_profile (id, name, age, weight_kg, height_cm, occupation, work_style, daily_water_ml,
                gender, diet, diet_notes, cuisines, health_goal, dress_style, wardrobe_notes, about_me, created_at, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?16)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name, age = excluded.age, weight_kg = excluded.weight_kg,
                height_cm = excluded.height_cm, occupation = excluded.occupation,
                work_style = excluded.work_style, daily_water_ml = excluded.daily_water_ml,
                gender = excluded.gender, diet = excluded.diet, diet_notes = excluded.diet_notes,
                cuisines = excluded.cuisines, health_goal = excluded.health_goal,
                dress_style = excluded.dress_style, wardrobe_notes = excluded.wardrobe_notes,
                about_me = excluded.about_me, updated_at = excluded.updated_at",
            rusqlite::params![
                input.name,
                input.age,
                input.weight_kg,
                input.height_cm,
                input.occupation,
                input.work_style,
                daily_water_ml,
                input.gender,
                input.diet,
                input.diet_notes,
                input.cuisines,
                input.health_goal,
                input.dress_style,
                input.wardrobe_notes,
                input.about_me,
                time::now_utc()
            ],
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
