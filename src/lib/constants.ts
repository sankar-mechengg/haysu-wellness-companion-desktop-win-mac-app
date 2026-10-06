import type { WorkStyle } from "./api";

// ─── Water calculation ───
export const WATER_ML_PER_KG = 35;
export const WATER_MIN_ML = 1500;
export const WATER_MAX_ML = 5000;

// ─── Adaptive intervals by work style (minutes) ───
export const ADAPTIVE_INTERVALS: Record<WorkStyle, { water: number; movement: number }> = {
  sedentary: { water: 25, movement: 35 },
  moderate: { water: 30, movement: 45 },
  active: { water: 40, movement: 60 },
};

export const WORK_STYLES: { id: WorkStyle; label: string; description: string; emoji: string }[] = [
  {
    id: "sedentary",
    label: "Sedentary",
    description: "Desk-bound most of the day, minimal physical activity",
    emoji: "🪑",
  },
  {
    id: "moderate",
    label: "Moderately active",
    description: "Mix of desk work and light movement, occasional walks",
    emoji: "🚶",
  },
  {
    id: "active",
    label: "Active",
    description: "Frequently moving, standing desk, regular exercise breaks",
    emoji: "🏃",
  },
];

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

export const WATER_QUICK_AMOUNTS = [150, 250, 350, 500] as const;

export const WEEKDAYS: { id: number; short: string; long: string }[] = [
  { id: 1, short: "Mon", long: "Monday" },
  { id: 2, short: "Tue", long: "Tuesday" },
  { id: 3, short: "Wed", long: "Wednesday" },
  { id: 4, short: "Thu", long: "Thursday" },
  { id: 5, short: "Fri", long: "Friday" },
  { id: 6, short: "Sat", long: "Saturday" },
  { id: 7, short: "Sun", long: "Sunday" },
];

// ─── Encouraging messages ───
export const WATER_MESSAGES = [
  "Time for a glass of water 💧",
  "Stay hydrated. Your body thanks you.",
  "Water break! Even a few sips help.",
  "Your brain is 75% water. Feed it 🧠",
  "Hydration check. Drink up.",
  "A sip at a time keeps the fatigue away.",
  "Water o'clock. Keep that flow going.",
  "Your cells are thirsty. Cheers 🥤",
];

export const MOVEMENT_MESSAGES = [
  "Time to stretch. Your body needs a break.",
  "Movement moment. Let's get those muscles going.",
  "Stand up, stretch out, feel alive 🌿",
  "Your body was made to move.",
  "Quick exercise break. You've earned it.",
  "Shake it off. A little movement goes a long way.",
];

export const POMODORO_WORK_COMPLETE_MESSAGES = [
  "Great focus session. Time for a well-earned break.",
  "Pure focus, nicely done ☕",
  "Work session done. Relax for a bit.",
];

export const POMODORO_BREAK_COMPLETE_MESSAGES = [
  "Break's over. Ready to go again?",
  "Refreshed? Let's get back to it 🎯",
  "Time to focus. You've got this.",
];

export function randomMessage(messages: readonly string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

export const RELEASES_URL =
  "https://github.com/sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app/releases";
export const REPO_URL =
  "https://github.com/sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app";
