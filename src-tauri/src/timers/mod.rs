pub mod water;
pub mod movement;
pub mod pomodoro;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReminderEvent {
    pub reminder_type: String,
    pub message: String,
    pub data: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerTickEvent {
    pub timer_type: String,
    pub remaining_secs: u64,
    pub total_secs: u64,
}
