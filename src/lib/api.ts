/**
 * Typed bridge to the Rust backend. Every command and event name lives here.
 */
import { invoke } from "@tauri-apps/api/core";

// ─── Types (mirror src-tauri/src/config.rs, db/models.rs, scheduler/mod.rs) ───

export type ReminderStyle = "popup" | "native" | "both";
export type Theme = "light" | "dark" | "system";
export type WorkStyle = "sedentary" | "moderate" | "active";
export type PomodoroPhase = "idle" | "work" | "short_break" | "long_break";
export type PauseReason = "dnd" | "schedule" | "idle";
export type ReminderKind = "water" | "movement" | "pomodoro";

export interface AppConfig {
  water_interval_min: number;
  movement_interval_min: number;
  water_amount_ml: number;
  snooze_minutes: number;
  popup_auto_dismiss_sec: number;
  reminder_style: ReminderStyle;
  sound_enabled: boolean;

  pomodoro_work_min: number;
  pomodoro_short_break_min: number;
  pomodoro_long_break_min: number;
  pomodoro_sessions_before_long: number;
  pomodoro_auto_start_break: boolean;
  pomodoro_auto_start_work: boolean;

  dnd_enabled: boolean;
  dnd_until: string;

  schedule_enabled: boolean;
  schedule_start: string;
  schedule_end: string;
  schedule_days: number[];
  idle_pause_enabled: boolean;
  idle_threshold_min: number;

  theme: Theme;
  widget_visible: boolean;
  widget_always_on_top: boolean;
  widget_x: number | null;
  widget_y: number | null;

  autostart_enabled: boolean;
  onboarding_complete: boolean;
  check_updates_on_launch: boolean;

  hotkey_toggle_pomodoro: string;
  hotkey_toggle_dnd: string;
  hotkey_show_dashboard: string;
  hotkey_log_water: string;
}

export type ConfigPatch = Partial<AppConfig>;

export interface HotkeyError {
  field: keyof AppConfig | string;
  combo: string;
  error: string;
}

export interface ConfigResult {
  config: AppConfig;
  hotkey_errors: HotkeyError[];
}

export interface UserProfile {
  id: number;
  name: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  occupation: string;
  work_style: WorkStyle;
  daily_water_ml: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileInput {
  name: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  occupation: string;
  work_style: WorkStyle;
}

export interface CountdownSnapshot {
  remaining_secs: number;
  total_secs: number;
}

export interface PomodoroSnapshot {
  phase: PomodoroPhase;
  remaining_secs: number;
  total_secs: number;
  session: number;
  running: boolean;
  paused: boolean;
  queued: PomodoroPhase;
}

export interface AppStateSnapshot {
  water: CountdownSnapshot;
  movement: CountdownSnapshot;
  pomodoro: PomodoroSnapshot;
  paused_reason: PauseReason | null;
  dnd: { enabled: boolean; until: string | null };
  idle_secs: number;
}

export interface ReminderEvent {
  id: number;
  kind: ReminderKind;
  message: string;
  data: string | null;
}

export interface PomodoroEvent {
  event: "started" | "work_complete" | "break_complete" | "stopped" | "paused" | "resumed";
  phase: PomodoroPhase;
  remaining_secs: number;
  total_secs: number;
  session: number;
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
  session_type: "work" | "short_break" | "long_break";
  completed: boolean;
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

export interface Streaks {
  current_streak: number;
  longest_streak: number;
  active_days_30: number;
  water_goal_streak: number;
  today_active: boolean;
}

export interface SystemInfo {
  version: string;
  platform: "windows" | "macos" | "linux" | string;
  log_dir: string | null;
  data_dir: string | null;
}

// ─── Event names ───

export const EVENTS = {
  tick: "timer-tick",
  reminder: "reminder",
  pomodoro: "pomodoro-phase",
  config: "config-changed",
  profile: "profile-changed",
  activity: "activity-logged",
  checkUpdates: "check-updates",
} as const;

// ─── Commands ───

export const api = {
  // Profile
  getUserProfile: () => invoke<UserProfile | null>("get_user_profile"),
  saveUserProfile: (p: ProfileInput) =>
    invoke<UserProfile>("save_user_profile", {
      name: p.name,
      age: p.age,
      weightKg: p.weight_kg,
      heightCm: p.height_cm,
      occupation: p.occupation,
      workStyle: p.work_style,
    }),
  hasCompletedOnboarding: () => invoke<boolean>("has_completed_onboarding"),

  // Config
  getConfig: () => invoke<AppConfig>("get_config"),
  updateConfig: (patch: ConfigPatch) => invoke<ConfigResult>("update_config", { patch }),
  setDnd: (enabled: boolean, minutes?: number) =>
    invoke<void>("set_dnd", { enabled, minutes: minutes ?? null }),
  toggleDnd: (minutes?: number) => invoke<void>("toggle_dnd", { minutes: minutes ?? null }),
  getHotkeyStatus: () => invoke<HotkeyError[]>("get_hotkey_status"),
  validateHotkey: (combo: string) => invoke<void>("validate_hotkey", { combo }),
  completeOnboarding: () => invoke<void>("complete_onboarding"),
  resetData: (scope: "logs" | "all") => invoke<void>("reset_data", { scope }),

  // Stats
  logWater: (consumed: boolean, amountMl: number) =>
    invoke<number>("log_water", { consumed, amountMl }),
  getWaterToday: () => invoke<WaterEntry[]>("get_water_today"),
  logMovement: (exerciseId: string, exerciseName: string, category: string, completed: boolean) =>
    invoke<number>("log_movement", { exerciseId, exerciseName, category, completed }),
  getMovementToday: () => invoke<MovementEntry[]>("get_movement_today"),
  getPomodoroToday: () => invoke<PomodoroEntry[]>("get_pomodoro_today"),
  deleteEntry: (kind: ReminderKind, id: number) => invoke<void>("delete_entry", { kind, id }),
  getTodayDate: () => invoke<string>("get_today_date"),
  getDailyStats: (date: string) => invoke<DailyStats>("get_daily_stats", { date }),
  getWeeklyStats: (startDate: string) => invoke<DailyStats[]>("get_weekly_stats", { startDate }),
  getStreaks: () => invoke<Streaks>("get_streaks"),

  // Export
  exportJson: (filePath: string) => invoke<string>("export_json", { filePath }),
  exportCsv: (folderPath: string) => invoke<string[]>("export_csv", { folderPath }),

  // Timers
  getAppState: () => invoke<AppStateSnapshot>("get_app_state"),
  snoozeReminder: (kind: "water" | "movement", minutes?: number) =>
    invoke<void>("snooze_reminder", { kind, minutes: minutes ?? null }),
  resetReminder: (kind: "water" | "movement") => invoke<void>("reset_reminder", { kind }),
  pomodoro: (action: "start" | "pause" | "resume" | "toggle" | "stop" | "skip") =>
    invoke<void>("pomodoro_action", { action }),
  hidePopup: () => invoke<void>("hide_popup"),

  // System
  getSystemInfo: () => invoke<SystemInfo>("get_system_info"),
  showWindow: (label: "widget" | "dashboard" | "settings" | "onboarding") =>
    invoke<void>("show_window", { label }),
  hideWindow: (label: string) => invoke<void>("hide_window", { label }),
  quit: () => invoke<void>("quit_app"),
};

/** Turn any thrown value into a readable string. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
