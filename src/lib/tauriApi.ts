import { invoke } from "@tauri-apps/api/core";

// ─── Types mirroring Rust models ───

export interface UserProfile {
  id: number;
  name: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  occupation: string;
  work_style: string;
  daily_water_ml: number;
  created_at: string;
  updated_at: string;
}

export interface DailyStats {
  date: string;
  water_consumed: number;
  water_skipped: number;
  water_total_ml: number;
  water_goal_ml: number;
  movement_completed: number;
  movement_skipped: number;
  pomodoro_work_completed: number;
  pomodoro_total_minutes: number;
}

export interface WaterEntry {
  id: number;
  timestamp: string;
  consumed: boolean;
  amount_ml: number;
}

export interface MovementEntry {
  id: number;
  timestamp: string;
  exercise_id: string;
  exercise_name: string;
  category: string;
  completed: boolean;
}

export interface PomodoroEntry {
  id: number;
  started_at: string;
  ended_at: string | null;
  session_type: string;
  completed: boolean;
}

export interface TimerTick {
  timer_type: string;
  remaining_secs: number;
  total_secs: number;
}

export interface PomodoroState {
  phase: string;
  remaining_secs: number;
  session: number;
  is_running: boolean;
  is_paused: boolean;
}

// ─── User Profile ───

export const api = {
  // User
  getUserProfile: () => invoke<UserProfile | null>("get_user_profile"),

  saveUserProfile: (profile: {
    name: string;
    age: number;
    weight_kg: number;
    height_cm: number;
    occupation: string;
    work_style: string;
  }) => invoke<UserProfile>("save_user_profile", {
    name: profile.name,
    age: profile.age,
    weightKg: profile.weight_kg,
    heightCm: profile.height_cm,
    occupation: profile.occupation,
    workStyle: profile.work_style,
  }),

  updateUserProfile: (profile: {
    name: string;
    age: number;
    weight_kg: number;
    height_cm: number;
    occupation: string;
    work_style: string;
  }) => invoke<UserProfile>("update_user_profile", {
    name: profile.name,
    age: profile.age,
    weightKg: profile.weight_kg,
    heightCm: profile.height_cm,
    occupation: profile.occupation,
    workStyle: profile.work_style,
  }),

  hasCompletedOnboarding: () => invoke<boolean>("has_completed_onboarding"),

  // Settings
  getSetting: (key: string) => invoke<string | null>("get_setting", { key }),
  setSetting: (key: string, value: string) => invoke<void>("set_setting", { key, value }),
  getAllSettings: () => invoke<Record<string, string>>("get_all_settings"),
  setMultipleSettings: (settings: Record<string, string>) =>
    invoke<void>("set_multiple_settings", { settings }),

  // Water
  logWater: (consumed: boolean, amountMl: number) =>
    invoke<number>("log_water", { consumed, amountMl }),
  getWaterToday: () => invoke<WaterEntry[]>("get_water_today"),

  // Movement
  logMovement: (exerciseId: string, exerciseName: string, category: string, completed: boolean) =>
    invoke<number>("log_movement", { exerciseId, exerciseName, category, completed }),
  getMovementToday: () => invoke<MovementEntry[]>("get_movement_today"),

  // Pomodoro
  logPomodoroStart: (sessionType: string) =>
    invoke<number>("log_pomodoro_start", { sessionType }),
  logPomodoroEnd: (id: number, completed: boolean) =>
    invoke<void>("log_pomodoro_end", { id, completed }),
  getPomodoroToday: () => invoke<PomodoroEntry[]>("get_pomodoro_today"),

  // Stats
  getDailyStats: (date: string) => invoke<DailyStats>("get_daily_stats", { date }),
  getWeeklyStats: (startDate: string) => invoke<DailyStats[]>("get_weekly_stats", { startDate }),

  // Export
  exportJson: (filePath: string) => invoke<string>("export_json", { filePath }),
  exportCsv: (folderPath: string) => invoke<string[]>("export_csv", { folderPath }),

  // Water Timer
  setWaterInterval: (minutes: number) => invoke<void>("set_water_interval", { minutes }),
  pauseWaterTimer: () => invoke<void>("pause_water_timer"),
  resumeWaterTimer: () => invoke<void>("resume_water_timer"),
  resetWaterTimer: () => invoke<void>("reset_water_timer"),
  getWaterTimerState: () => invoke<TimerTick>("get_water_timer_state"),

  // Movement Timer
  setMovementInterval: (minutes: number) => invoke<void>("set_movement_interval", { minutes }),
  pauseMovementTimer: () => invoke<void>("pause_movement_timer"),
  resumeMovementTimer: () => invoke<void>("resume_movement_timer"),
  resetMovementTimer: () => invoke<void>("reset_movement_timer"),
  getMovementTimerState: () => invoke<TimerTick>("get_movement_timer_state"),

  // Pomodoro Timer
  startPomodoro: () => invoke<void>("start_pomodoro"),
  pausePomodoro: () => invoke<void>("pause_pomodoro"),
  resumePomodoro: () => invoke<void>("resume_pomodoro"),
  stopPomodoro: () => invoke<void>("stop_pomodoro"),
  skipPomodoroPhase: () => invoke<void>("skip_pomodoro_phase"),
  getPomodoroState: () => invoke<PomodoroState>("get_pomodoro_state"),
  togglePomodoro: () => invoke<void>("toggle_pomodoro"),

  // Autostart
  enableAutostart: () => invoke<void>("cmd_enable_autostart"),
  disableAutostart: () => invoke<void>("cmd_disable_autostart"),
  isAutostartEnabled: () => invoke<boolean>("cmd_is_autostart_enabled"),
};
