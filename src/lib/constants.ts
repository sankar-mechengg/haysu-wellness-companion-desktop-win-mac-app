// ─── Default Intervals (minutes) ───
export const DEFAULT_WATER_INTERVAL = 30;
export const DEFAULT_MOVEMENT_INTERVAL = 45;
export const DEFAULT_POMODORO_WORK = 25;
export const DEFAULT_POMODORO_SHORT_BREAK = 5;
export const DEFAULT_POMODORO_LONG_BREAK = 15;
export const DEFAULT_POMODORO_SESSIONS = 4;
export const DEFAULT_WATER_AMOUNT_ML = 250;

// ─── Adaptive Intervals by Work Style ───
export const ADAPTIVE_INTERVALS = {
  sedentary: { water: 25, movement: 35 },
  moderate: { water: 30, movement: 45 },
  active: { water: 40, movement: 60 },
} as const;

// ─── Water Calculation ───
export const WATER_ML_PER_KG = 35;
export const WATER_MIN_ML = 1500;
export const WATER_MAX_ML = 5000;

// ─── Hotkeys ───
export const HOTKEYS = {
  togglePomodoro: { label: "Ctrl+Shift+J", mac: "⌘+Shift+J" },
  toggleDnd: { label: "Ctrl+Shift+K", mac: "⌘+Shift+K" },
} as const;

// ─── Work Styles ───
export const WORK_STYLES = [
  {
    id: "sedentary",
    label: "Sedentary",
    description: "Desk-bound most of the day, minimal physical activity",
    emoji: "🪑",
  },
  {
    id: "moderate",
    label: "Moderately Active",
    description: "Mix of desk work and light movement, occasional walks",
    emoji: "🚶",
  },
  {
    id: "active",
    label: "Active",
    description: "Frequently moving, standing desk, regular exercise breaks",
    emoji: "🏃",
  },
] as const;

// ─── Occupations (common presets) ───
export const OCCUPATIONS = [
  "Software Developer",
  "Designer",
  "Writer / Content Creator",
  "Student",
  "Researcher",
  "Manager / Admin",
  "Analyst",
  "Accountant",
  "Teacher / Professor",
  "Gamer / Streamer",
  "Other",
] as const;

// ─── Encouraging Messages ───
export const WATER_MESSAGES = [
  "Time for a glass of water! 💧",
  "Stay hydrated — your body thanks you!",
  "Water break! Even a few sips help.",
  "Your brain is 75% water. Feed it! 🧠",
  "Hydration check! Drink up.",
  "A sip a time keeps the fatigue away.",
  "Water o'clock! Keep that flow going.",
  "Your cells are thirsty. Cheers! 🥤",
];

export const MOVEMENT_MESSAGES = [
  "Time to stretch! Your body needs a break.",
  "Movement moment! Let's get those muscles going.",
  "Stand up, stretch out, feel alive! 🌿",
  "Your body was made to move. Let's go!",
  "Quick exercise break — you've earned it.",
  "Shake it off! A little movement goes a long way.",
];

export const POMODORO_WORK_COMPLETE_MESSAGES = [
  "Great focus session! Time for a well-earned break.",
  "25 minutes of pure focus. Nice work! ☕",
  "Work session done! Relax for a bit.",
];

export const POMODORO_BREAK_COMPLETE_MESSAGES = [
  "Break's over! Ready to crush it again?",
  "Refreshed? Let's get back to it! 🎯",
  "Time to focus — you've got this!",
];

/** Pick a random message from an array */
export function randomMessage(messages: readonly string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}
