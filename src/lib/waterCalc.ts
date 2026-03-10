import { WATER_ML_PER_KG, WATER_MIN_ML, WATER_MAX_ML } from "./constants";

/** Calculate recommended daily water intake in ml */
export function calculateDailyWater(weightKg: number): number {
  const raw = Math.round(weightKg * WATER_ML_PER_KG);
  return Math.max(WATER_MIN_ML, Math.min(WATER_MAX_ML, raw));
}

/** Format ml to a readable string */
export function formatWaterMl(ml: number): string {
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(1)}L`;
  }
  return `${ml}ml`;
}

/** Calculate glasses from ml (assuming 250ml per glass) */
export function mlToGlasses(ml: number, glassSize: number = 250): number {
  return Math.round(ml / glassSize);
}

/** Get progress percentage */
export function waterProgress(consumedMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return Math.min(100, Math.round((consumedMl / goalMl) * 100));
}

/** Format seconds to MM:SS */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Format seconds to human readable "Xm Ys" */
export function formatTimeShort(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

/** Get a friendly label for next reminder */
export function nextReminderLabel(type: string, remainingSecs: number): string {
  const time = formatTimeShort(remainingSecs);
  switch (type) {
    case "water":
      return `💧 Water in ${time}`;
    case "movement":
      return `🏃 Move in ${time}`;
    case "pomodoro_work":
      return `🍅 Focus: ${time}`;
    case "pomodoro_short_break":
      return `☕ Break: ${time}`;
    case "pomodoro_long_break":
      return `🌴 Long break: ${time}`;
    default:
      return `⏱️ ${time}`;
  }
}
