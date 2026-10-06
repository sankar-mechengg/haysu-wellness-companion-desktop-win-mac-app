use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: i64,
    pub name: String,
    pub age: i64,
    pub weight_kg: f64,
    pub height_cm: f64,
    pub occupation: String,
    pub work_style: String,
    pub daily_water_ml: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaterEntry {
    pub id: i64,
    pub timestamp: String,
    pub consumed: bool,
    pub amount_ml: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovementEntry {
    pub id: i64,
    pub timestamp: String,
    pub exercise_id: String,
    pub exercise_name: String,
    pub category: String,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PomodoroEntry {
    pub id: i64,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub session_type: String,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DailyStats {
    pub date: String,
    pub water_consumed: i64,
    pub water_skipped: i64,
    pub water_total_ml: i64,
    pub water_goal_ml: i64,
    pub movement_completed: i64,
    pub movement_skipped: i64,
    pub pomodoro_work_completed: i64,
    pub pomodoro_total_minutes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Streaks {
    /// Consecutive active days ending today (or yesterday if today is empty so far).
    pub current_streak: i64,
    pub longest_streak: i64,
    /// Days with any activity in the last 30 days.
    pub active_days_30: i64,
    /// Consecutive days the water goal was met, ending today or yesterday.
    pub water_goal_streak: i64,
    /// Whether today already counts as active.
    pub today_active: bool,
}
