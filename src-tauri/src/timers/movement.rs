use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use rand::Rng;
use super::{ReminderEvent, TimerTickEvent};

/// Shared state for movement timer control
pub struct MovementTimerState {
    pub running: AtomicBool,
    pub paused: AtomicBool,
    pub interval_secs: AtomicU64,
    pub remaining_secs: AtomicU64,
}

impl Default for MovementTimerState {
    fn default() -> Self {
        Self {
            running: AtomicBool::new(false),
            paused: AtomicBool::new(false),
            interval_secs: AtomicU64::new(45 * 60), // 45 minutes
            remaining_secs: AtomicU64::new(45 * 60),
        }
    }
}

/// Exercise data passed to frontend for rendering
const EXERCISE_IDS: &[&str] = &[
    "neck_rolls", "shoulder_shrugs", "wrist_circles", "arm_cross_stretch",
    "chest_opener", "upper_back_stretch", "side_bends", "forearm_stretch",
    "finger_spread", "trapezius_release", "seated_spinal_twist", "shoulder_blade_squeeze",
    "calf_raises", "seated_leg_extensions", "hip_flexor_stretch", "ankle_circles",
    "glute_squeeze", "wall_sit", "standing_quad_stretch", "hamstring_stretch",
    "toe_raises", "knee_lifts", "figure_four_stretch", "standing_side_leg_raise",
    "eye_20_20_20", "eye_circles", "palming", "focus_shifting",
    "blinking_exercise", "figure_eight_tracking", "peripheral_awareness", "eye_squeeze_release",
    "box_breathing", "breathing_4_7_8", "deep_belly_breathing", "alternate_nostril",
    "pursed_lip_breathing", "lions_breath", "humming_breath", "progressive_muscle_relaxation",
];

/// Pick a random exercise ID to send to the frontend
fn pick_random_exercise() -> String {
    let mut rng = rand::thread_rng();
    let idx = rng.gen_range(0..EXERCISE_IDS.len());
    EXERCISE_IDS[idx].to_string()
}

/// Start the movement reminder background loop
pub fn start_movement_timer(app: AppHandle) {
    let state = app.state::<Arc<MovementTimerState>>();
    state.running.store(true, Ordering::SeqCst);
    state.paused.store(false, Ordering::SeqCst);
    let interval = state.interval_secs.load(Ordering::SeqCst);
    state.remaining_secs.store(interval, Ordering::SeqCst);

    let timer_state = app.state::<Arc<MovementTimerState>>().inner().clone();
    let app_handle = app.clone();

    tokio::spawn(async move {
        loop {
            if !timer_state.running.load(Ordering::SeqCst) {
                break;
            }

            if timer_state.paused.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_secs(1)).await;
                continue;
            }

            let remaining = timer_state.remaining_secs.load(Ordering::SeqCst);
            let total = timer_state.interval_secs.load(Ordering::SeqCst);

            if remaining == 0 {
                let exercise_id = pick_random_exercise();
                let _ = app_handle.emit(
                    "reminder",
                    ReminderEvent {
                        reminder_type: "movement".to_string(),
                        message: "Time to move! Here's your exercise.".to_string(),
                        data: Some(exercise_id),
                    },
                );

                // Reset timer
                timer_state.remaining_secs.store(total, Ordering::SeqCst);
            } else {
                timer_state
                    .remaining_secs
                    .fetch_sub(1, Ordering::SeqCst);

                if remaining % 5 == 0 {
                    let _ = app_handle.emit(
                        "timer-tick",
                        TimerTickEvent {
                            timer_type: "movement".to_string(),
                            remaining_secs: remaining,
                            total_secs: total,
                        },
                    );
                }
            }

            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    });
}

// ─── Commands ───

#[tauri::command]
pub fn set_movement_interval(app: AppHandle, minutes: u64) {
    let state = app.state::<Arc<MovementTimerState>>();
    let secs = minutes * 60;
    state.interval_secs.store(secs, Ordering::SeqCst);
    state.remaining_secs.store(secs, Ordering::SeqCst);
}

#[tauri::command]
pub fn pause_movement_timer(app: AppHandle) {
    let state = app.state::<Arc<MovementTimerState>>();
    state.paused.store(true, Ordering::SeqCst);
}

#[tauri::command]
pub fn resume_movement_timer(app: AppHandle) {
    let state = app.state::<Arc<MovementTimerState>>();
    state.paused.store(false, Ordering::SeqCst);
}

#[tauri::command]
pub fn reset_movement_timer(app: AppHandle) {
    let state = app.state::<Arc<MovementTimerState>>();
    let interval = state.interval_secs.load(Ordering::SeqCst);
    state.remaining_secs.store(interval, Ordering::SeqCst);
}

#[tauri::command]
pub fn get_movement_timer_state(app: AppHandle) -> super::TimerTickEvent {
    let state = app.state::<Arc<MovementTimerState>>();
    TimerTickEvent {
        timer_type: "movement".to_string(),
        remaining_secs: state.remaining_secs.load(Ordering::SeqCst),
        total_secs: state.interval_secs.load(Ordering::SeqCst),
    }
}
