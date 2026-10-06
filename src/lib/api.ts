/**
 * Typed bridge to the Rust backend. Every command and event name lives here.
 */
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

// ─── Types (mirror src-tauri/src/config.rs, db/models.rs, scheduler/mod.rs, health/mod.rs) ───

export type ReminderStyle = "popup" | "native" | "both";
export type Theme = "light" | "dark" | "system";
export type DarkVariant = "grey" | "blue";
export type WorkStyle = "sedentary" | "moderate" | "active";
export type PomodoroPhase = "idle" | "work" | "short_break" | "long_break";
export type PauseReason = "dnd" | "schedule" | "idle";
export type ReminderKind = "water" | "movement" | "pomodoro" | "medicine" | "care" | "briefing";

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

  dark_variant: DarkVariant;

  medicine_reminders_enabled: boolean;
  medicine_override_dnd: boolean;
  medicine_missed_after_min: number;

  ai_provider: "auto" | AiProvider;
  ai_model_anthropic: string;
  ai_model_openai: string;
  ai_model_zai: string;
  ai_model_openrouter: string;
  ai_share_health: boolean;
  ai_share_diary: boolean;
  ai_share_location: boolean;
  ai_keep_photos: boolean;
  ai_max_tokens: number;
  ai_briefing_time: string;
  ai_last_briefing_date: string;

  location_name: string;
  location_lat: number | null;
  location_lon: number | null;

  care_default_time: string;

  auto_backup: boolean;
  auto_backup_keep: number;

  window_effects: boolean;
  ui_animations: boolean;

  hotkey_open_assistant: string;
}

export type AiProvider = "anthropic" | "openai" | "zai" | "openrouter";

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

export type Diet =
  "" | "non_vegetarian" | "vegetarian" | "vegan" | "eggetarian" | "pescatarian" | "other";
export type HealthGoal =
  | ""
  | "maintain"
  | "lose_weight"
  | "gain_weight"
  | "build_strength"
  | "more_energy"
  | "better_sleep"
  | "manage_condition";
export type DressStyle =
  "" | "casual" | "smart_casual" | "business" | "formal" | "sporty" | "traditional" | "other";

export interface ProfileInput {
  name: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  occupation: string;
  work_style: WorkStyle;
  gender: string;
  diet: Diet;
  diet_notes: string;
  cuisines: string;
  health_goal: HealthGoal;
  dress_style: DressStyle;
  wardrobe_notes: string;
  about_me: string;
}

export interface UserProfile extends ProfileInput {
  id: number;
  daily_water_ml: number;
  created_at: string;
  updated_at: string;
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

export interface NextDose {
  medicine_id: number;
  name: string;
  dose: string;
  /** Local slot `YYYY-MM-DD HH:MM`. */
  scheduled_at: string;
  overdue: boolean;
}

export interface AppStateSnapshot {
  water: CountdownSnapshot;
  movement: CountdownSnapshot;
  pomodoro: PomodoroSnapshot;
  paused_reason: PauseReason | null;
  dnd: { enabled: boolean; until: string | null };
  idle_secs: number;
  next_dose: NextDose | null;
  doses_pending: number;
}

export interface ReminderEvent {
  id: number;
  kind: ReminderKind;
  message: string;
  data: string | null;
}

/** JSON carried in `ReminderEvent.data` for medicine reminders. */
export interface MedicineReminderData {
  medicine_id: number;
  name: string;
  dose: string;
  instructions: string;
  color: string;
  scheduled_at: string;
  first: boolean;
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
  effects_supported: boolean;
}

// ─── Health ───

export interface Medicine {
  id: number;
  name: string;
  dose: string;
  instructions: string;
  times: string[];
  days: number[];
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  color: string;
  created_at: string;
}

export interface MedicineInput {
  id?: number;
  name: string;
  dose: string;
  instructions: string;
  times: string[];
  days: number[];
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  color: string;
}

export type DoseStatus = "pending" | "snoozed" | "taken" | "skipped" | "missed" | "upcoming";

export interface DoseLog {
  id: number;
  medicine_id: number;
  scheduled_at: string;
  status: DoseStatus;
  taken_at: string | null;
  snoozed_until: string | null;
  note: string;
}

export interface DoseSlot {
  medicine_id: number;
  name: string;
  dose: string;
  instructions: string;
  color: string;
  scheduled_at: string;
  status: DoseStatus;
  taken_at: string | null;
  note: string;
}

export interface AdherenceStats {
  days: number;
  scheduled: number;
  taken: number;
  skipped: number;
  missed: number;
  pending: number;
  adherence_pct: number;
}

export type ConditionStatus = "active" | "resolved";

export interface Condition {
  id: number;
  name: string;
  notes: string;
  severity: number;
  status: ConditionStatus;
  started_on: string | null;
  resolved_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConditionInput {
  id?: number;
  name: string;
  notes: string;
  severity: number;
  status: ConditionStatus;
  started_on: string | null;
  resolved_on: string | null;
}

export interface DiaryEntry {
  id: number;
  timestamp: string;
  date: string;
  mood: number | null;
  energy: number | null;
  sleep_hours: number | null;
  pain: number | null;
  symptoms: string[];
  notes: string;
  condition_id: number | null;
}

export interface DiaryInput {
  id?: number;
  timestamp?: string;
  mood: number | null;
  energy: number | null;
  sleep_hours: number | null;
  pain: number | null;
  symptoms: string[];
  notes: string;
  condition_id: number | null;
}

export type MeasurementKind =
  "weight" | "blood_pressure" | "heart_rate" | "temperature" | "glucose" | "spo2";

export interface Measurement {
  id: number;
  kind: MeasurementKind;
  value: number;
  value2: number | null;
  unit: string;
  measured_at: string;
  notes: string;
}

export interface MeasurementInput {
  kind: MeasurementKind;
  value: number;
  value2?: number | null;
  measured_at?: string;
  notes?: string;
}

export type Meal = "breakfast" | "lunch" | "dinner" | "snack" | "drink";

export interface FoodEntry {
  id: number;
  timestamp: string;
  meal: Meal;
  description: string;
  calories: number | null;
  notes: string;
}

export interface FoodInput {
  timestamp?: string;
  meal: Meal;
  description: string;
  calories?: number | null;
  notes?: string;
}

// ─── AI ───

export interface ImageData {
  media_type: string;
  base64: string;
}

export interface ProviderStatus {
  provider: AiProvider;
  label: string;
  has_key: boolean;
  masked_key: string;
  model: string;
  known_models: string[];
  console_url: string;
}

export interface AiStatus {
  providers: ProviderStatus[];
  active: AiProvider | null;
  active_model: string | null;
  selection: string;
}

export type AiKind =
  "chat" | "briefing" | "meals" | "outfit" | "posture" | "week" | "grooming" | "doctor";

export interface Conversation {
  id: number;
  title: string;
  kind: AiKind | string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface StoredMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | string;
  content: string;
  has_image: boolean;
  provider: string;
  model: string;
  created_at: string;
}

export interface SendInput {
  conversation_id?: number | null;
  message?: string;
  kind?: AiKind;
  images?: ImageData[];
}

export interface SendResult {
  conversation_id: number;
  message: StoredMessage;
}

// ─── Weather ───

export interface GeoLocation {
  name: string;
  country: string;
  admin: string;
  lat: number;
  lon: number;
}

export interface Weather {
  location_name: string;
  temp_c: number;
  feels_like_c: number;
  temp_min_c: number;
  temp_max_c: number;
  humidity: number;
  wind_kph: number;
  precipitation_prob: number;
  uv_index: number;
  weather_code: number;
  description: string;
  icon: string;
  is_day: boolean;
  sunrise: string;
  sunset: string;
  fetched_at: string;
}

// ─── Care routines ───

export type CareKind = "generic" | "photo_check" | "diary" | "measurement";

export interface CareRoutine {
  id: number;
  name: string;
  icon: string;
  kind: CareKind;
  interval_days: number;
  time_of_day: string;
  last_done: string | null;
  last_reminded: string | null;
  snoozed_until: string | null;
  active: boolean;
  notes: string;
  created_at: string;
}

export interface CareRoutineInput {
  id?: number;
  name: string;
  icon: string;
  kind: CareKind;
  interval_days: number;
  time_of_day: string;
  active: boolean;
  notes: string;
  last_done?: string | null;
}

export interface CarePreset {
  name: string;
  icon: string;
  kind: CareKind;
  interval_days: number;
  time_of_day: string;
  notes: string;
}

/** JSON carried in `ReminderEvent.data` for care reminders. */
export interface CareReminderData {
  id: number;
  name: string;
  icon: string;
  kind: CareKind;
  notes: string;
  interval_days: number;
  last_done: string | null;
}

// ─── Backup ───

export interface ArchivePreview {
  format: "haysu-backup" | "haysu-snapshot" | string;
  app_version: string;
  created_at: string;
  exported_by: string;
  has_profile: boolean;
  counts: [string, number][];
}

export interface ImportReport {
  format: string;
  created_at: string;
  exported_by: string;
  profile: boolean;
  settings: number;
  water: number;
  movement: number;
  pomodoro: number;
  medicines: number;
  doses: number;
  conditions: number;
  diary: number;
  measurements: number;
  food: number;
  care_routines: number;
  skipped: number;
}

// ─── Event names ───

export const EVENTS = {
  tick: "timer-tick",
  reminder: "reminder",
  pomodoro: "pomodoro-phase",
  config: "config-changed",
  profile: "profile-changed",
  activity: "activity-logged",
  health: "health-changed",
  care: "care-changed",
  checkUpdates: "check-updates",
  aiDelta: "ai-delta",
  aiDone: "ai-done",
  aiError: "ai-error",
  aiHistory: "ai-history-changed",
  aiStatus: "ai-status-changed",
  importFile: "import-file",
  openAssistant: "open-assistant",
  openSettingsTab: "open-settings-tab",
} as const;

// ─── Commands ───

export const api = {
  // Profile
  getUserProfile: () => invoke<UserProfile | null>("get_user_profile"),
  saveUserProfile: (input: ProfileInput) => invoke<UserProfile>("save_user_profile", { input }),
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
  deleteEntry: (kind: "water" | "movement" | "pomodoro", id: number) =>
    invoke<void>("delete_entry", { kind, id }),
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

  // Health · medicines
  listMedicines: () => invoke<Medicine[]>("list_medicines"),
  saveMedicine: (input: MedicineInput) => invoke<Medicine>("save_medicine", { input }),
  deleteMedicine: (id: number) => invoke<void>("delete_medicine", { id }),
  getDoseSchedule: (date?: string) =>
    invoke<DoseSlot[]>("get_dose_schedule", { date: date ?? null }),
  logDose: (
    medicineId: number,
    scheduledAt: string,
    status: "taken" | "skipped" | "pending",
    note?: string
  ) => invoke<DoseLog>("log_dose", { medicineId, scheduledAt, status, note: note ?? null }),
  snoozeDose: (medicineId: number, scheduledAt: string, minutes?: number) =>
    invoke<void>("snooze_dose", { medicineId, scheduledAt, minutes: minutes ?? null }),
  getAdherence: (days?: number) => invoke<AdherenceStats>("get_adherence", { days: days ?? null }),

  // Health · conditions
  listConditions: () => invoke<Condition[]>("list_conditions"),
  saveCondition: (input: ConditionInput) => invoke<Condition>("save_condition", { input }),
  deleteCondition: (id: number) => invoke<void>("delete_condition", { id }),

  // Health · diary
  listDiary: (from: string, to: string) => invoke<DiaryEntry[]>("list_diary", { from, to }),
  saveDiaryEntry: (input: DiaryInput) => invoke<DiaryEntry>("save_diary_entry", { input }),
  deleteDiaryEntry: (id: number) => invoke<void>("delete_diary_entry", { id }),
  getSymptomSuggestions: () => invoke<string[]>("get_symptom_suggestions"),

  // Health · measurements
  listMeasurements: (kind?: MeasurementKind, days?: number) =>
    invoke<Measurement[]>("list_measurements", { kind: kind ?? null, days: days ?? null }),
  addMeasurement: (input: MeasurementInput) => invoke<Measurement>("add_measurement", { input }),
  deleteMeasurement: (id: number) => invoke<void>("delete_measurement", { id }),

  // Health · food
  listFood: (days?: number) => invoke<FoodEntry[]>("list_food", { days: days ?? null }),
  addFood: (input: FoodInput) => invoke<FoodEntry>("add_food", { input }),
  deleteFood: (id: number) => invoke<void>("delete_food", { id }),

  // AI
  aiStatus: () => invoke<AiStatus>("ai_status"),
  aiSetKey: (provider: AiProvider, key: string) =>
    invoke<AiStatus>("ai_set_key", { provider, key }),
  aiListModels: (provider: AiProvider) => invoke<string[]>("ai_list_models", { provider }),
  aiTest: (provider: AiProvider) => invoke<string>("ai_test", { provider }),
  aiConversations: () => invoke<Conversation[]>("ai_conversations"),
  aiMessages: (conversationId: number) =>
    invoke<StoredMessage[]>("ai_messages", { conversationId }),
  aiDeleteConversation: (id: number) => invoke<void>("ai_delete_conversation", { id }),
  aiRenameConversation: (id: number, title: string) =>
    invoke<void>("ai_rename_conversation", { id, title }),
  aiClearHistory: () => invoke<void>("ai_clear_history"),
  aiSend: (input: SendInput) => invoke<SendResult>("ai_send", { input }),
  aiSavePhoto: (image: ImageData, label: string) =>
    invoke<string>("ai_save_photo", { image, label }),
  aiReadImage: (path: string) => invoke<ImageData>("ai_read_image", { path }),

  // Weather
  weatherSearch: (query: string) => invoke<GeoLocation[]>("weather_search", { query }),
  weatherSetLocation: (location: GeoLocation | null) =>
    invoke<void>("weather_set_location", { location }),
  weatherNow: () => invoke<Weather | null>("weather_now"),

  // Care routines
  careList: () => invoke<CareRoutine[]>("care_list"),
  carePresets: () => invoke<CarePreset[]>("care_presets"),
  careSave: (input: CareRoutineInput) => invoke<CareRoutine>("care_save", { input }),
  careAddPreset: (name: string) => invoke<CareRoutine>("care_add_preset", { name }),
  careDelete: (id: number) => invoke<void>("care_delete", { id }),
  careDone: (id: number, date?: string) => invoke<void>("care_done", { id, date: date ?? null }),
  careSnooze: (id: number, days?: number) =>
    invoke<void>("care_snooze", { id, days: days ?? null }),

  // Backup
  backupExportHay: (path: string, includeAi = true) =>
    invoke<string>("backup_export_hay", { path, includeAi }),
  backupExportSu: (path: string) => invoke<string>("backup_export_su", { path }),
  backupPreview: (path: string) => invoke<ArchivePreview>("backup_preview", { path }),
  backupImport: (path: string, replace: boolean) =>
    invoke<ImportReport>("backup_import", { path, replace }),
  backupList: () => invoke<[string, number][]>("backup_list"),
  backupNow: () => invoke<string>("backup_now"),
  backupHealthReport: () => invoke<string>("backup_health_report"),
  backupSaveReport: (path: string) => invoke<string>("backup_save_report", { path }),
  backupTakePendingImport: () => invoke<string | null>("backup_take_pending_import"),

  // Effects
  /** Show the dashboard and jump to the Haysu AI tab (optionally on a conversation). */
  openAssistant: async (conversationId?: number | null) => {
    await invoke<void>("show_window", { label: "dashboard" });
    await emit(EVENTS.openAssistant, conversationId ?? null);
  },
  windowEffectsActive: (label: string) => invoke<boolean>("window_effects_active", { label }),
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
