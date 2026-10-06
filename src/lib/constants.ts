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

// ─── Personal details ───
export const DIET_OPTIONS: { id: import("./api").Diet; label: string; emoji: string }[] = [
  { id: "non_vegetarian", label: "Non-vegetarian", emoji: "🍗" },
  { id: "vegetarian", label: "Vegetarian", emoji: "🥦" },
  { id: "eggetarian", label: "Eggetarian", emoji: "🥚" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "pescatarian", label: "Pescatarian", emoji: "🐟" },
  { id: "other", label: "Other", emoji: "🍽️" },
];

export const GOAL_OPTIONS: { id: import("./api").HealthGoal; label: string }[] = [
  { id: "maintain", label: "Stay healthy" },
  { id: "lose_weight", label: "Lose weight" },
  { id: "gain_weight", label: "Gain weight" },
  { id: "build_strength", label: "Build strength" },
  { id: "more_energy", label: "More energy" },
  { id: "better_sleep", label: "Better sleep" },
  { id: "manage_condition", label: "Manage a condition" },
];

export const DRESS_OPTIONS: { id: import("./api").DressStyle; label: string; emoji: string }[] = [
  { id: "casual", label: "Casual", emoji: "👕" },
  { id: "smart_casual", label: "Smart casual", emoji: "👔" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "formal", label: "Formal", emoji: "🤵" },
  { id: "sporty", label: "Sporty", emoji: "🏃" },
  { id: "traditional", label: "Traditional", emoji: "🪷" },
  { id: "other", label: "Other", emoji: "✨" },
];

export const MEAL_OPTIONS: { id: import("./api").Meal; label: string; emoji: string }[] = [
  { id: "breakfast", label: "Breakfast", emoji: "🌅" },
  { id: "lunch", label: "Lunch", emoji: "🍱" },
  { id: "dinner", label: "Dinner", emoji: "🍽️" },
  { id: "snack", label: "Snack", emoji: "🍎" },
  { id: "drink", label: "Drink", emoji: "🥤" },
];

export const AI_QUICK_ACTIONS: {
  kind: import("./api").AiKind;
  label: string;
  icon: string;
  hint: string;
}[] = [
  {
    kind: "briefing",
    label: "Daily briefing",
    icon: "☀️",
    hint: "Weather, doses, food and focus for today",
  },
  {
    kind: "meals",
    label: "Plan my meals",
    icon: "🥗",
    hint: "Fits your diet, goal and what you ate",
  },
  {
    kind: "outfit",
    label: "What to wear",
    icon: "👕",
    hint: "From today's weather and your style",
  },
  {
    kind: "posture",
    label: "Posture check",
    icon: "📷",
    hint: "A photo for posture and grooming tips",
  },
  { kind: "week", label: "Review my week", icon: "📈", hint: "Patterns across all your records" },
  {
    kind: "grooming",
    label: "Grooming routine",
    icon: "🪥",
    hint: "A simple weekly self-care plan",
  },
  {
    kind: "doctor",
    label: "Summary for my doctor",
    icon: "🩺",
    hint: "Neutral, dated, ready to share",
  },
];
