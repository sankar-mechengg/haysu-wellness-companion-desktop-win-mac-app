import type { DiaryEntry, DoseStatus, Measurement, MeasurementKind } from "./api";
import { addDays, localDateString, parseLocalDate } from "./format";

export const MOOD_LABELS = ["Awful", "Low", "Okay", "Good", "Great"] as const;
export const MOOD_EMOJI = ["😞", "😕", "😐", "🙂", "😄"] as const;
export const ENERGY_LABELS = ["Drained", "Tired", "Steady", "Energised", "Buzzing"] as const;
export const ENERGY_EMOJI = ["🪫", "😴", "🔋", "⚡", "🚀"] as const;

export const SEVERITY_LABELS = ["Mild", "Light", "Moderate", "Strong", "Severe"] as const;

export const MEDICINE_COLORS = [
  "#3b93f7",
  "#5cc99a",
  "#ff7b7b",
  "#f5b53f",
  "#c084fc",
  "#f472b6",
  "#38bdf8",
  "#a3e635",
] as const;

export const MEASUREMENT_META: Record<
  MeasurementKind,
  {
    label: string;
    unit: string;
    icon: string;
    min: number;
    max: number;
    step: number;
    dual?: boolean;
  }
> = {
  weight: { label: "Weight", unit: "kg", icon: "⚖️", min: 20, max: 400, step: 0.1 },
  blood_pressure: {
    label: "Blood pressure",
    unit: "mmHg",
    icon: "🩺",
    min: 40,
    max: 300,
    step: 1,
    dual: true,
  },
  heart_rate: { label: "Heart rate", unit: "bpm", icon: "❤️", min: 20, max: 250, step: 1 },
  temperature: { label: "Temperature", unit: "°C", icon: "🌡️", min: 30, max: 45, step: 0.1 },
  glucose: { label: "Blood glucose", unit: "mg/dL", icon: "🩸", min: 20, max: 700, step: 1 },
  spo2: { label: "Oxygen (SpO₂)", unit: "%", icon: "🫁", min: 50, max: 100, step: 1 },
};

export const MEASUREMENT_KINDS = Object.keys(MEASUREMENT_META) as MeasurementKind[];

export function formatMeasurement(m: Measurement): string {
  if (m.kind === "blood_pressure" && m.value2 != null) {
    return `${Math.round(m.value)}/${Math.round(m.value2)} ${m.unit}`;
  }
  const v = Number.isInteger(m.value) ? m.value.toString() : m.value.toFixed(1);
  return `${v} ${m.unit}`;
}

/** `YYYY-MM-DD HH:MM` → `HH:MM`. */
export function slotTime(slot: string): string {
  return slot.slice(11, 16);
}

export function slotDate(slot: string): string {
  return slot.slice(0, 10);
}

/** Local Date for a slot string. */
export function slotToDate(slot: string): Date {
  const d = parseLocalDate(slotDate(slot));
  const [h, m] = slotTime(slot).split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function doseStatusMeta(status: DoseStatus): { label: string; cls: string; icon: string } {
  switch (status) {
    case "taken":
      return { label: "Taken", cls: "bg-move/15 text-move", icon: "✓" };
    case "skipped":
      return {
        label: "Skipped",
        cls: "bg-surface-hover dark:bg-surface-hover-dark text-text-secondary dark:text-text-secondary-dark",
        icon: "–",
      };
    case "missed":
      return { label: "Missed", cls: "bg-tomato/15 text-tomato", icon: "!" };
    case "snoozed":
      return { label: "Snoozed", cls: "bg-amber/20 text-amber", icon: "⏰" };
    case "pending":
      return { label: "Due now", cls: "bg-amber/20 text-amber", icon: "•" };
    default:
      return {
        label: "Upcoming",
        cls: "bg-haysu-100 dark:bg-haysu-500/15 text-haysu-600 dark:text-haysu-300",
        icon: "○",
      };
  }
}

/** Entries grouped by local date, newest date first, preserving input order inside a day. */
export function groupByDate<T extends { date: string }>(
  items: T[]
): { date: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const list = map.get(it.date) ?? [];
    list.push(it);
    map.set(it.date, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

export interface DailyWellbeing {
  date: string;
  label: string;
  mood: number | null;
  energy: number | null;
  pain: number | null;
  sleep: number | null;
  entries: number;
}

/** Per-day averages for the last `days` days ending today (oldest first). */
export function dailySeries(entries: DiaryEntry[], days: number): DailyWellbeing[] {
  const today = new Date();
  const out: DailyWellbeing[] = [];
  const byDate = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  const avg = (vals: (number | null)[]): number | null => {
    const nums = vals.filter((v): v is number => v != null);
    if (nums.length === 0) return null;
    return Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 10) / 10;
  };
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const date = localDateString(d);
    const list = byDate.get(date) ?? [];
    out.push({
      date,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      mood: avg(list.map((e) => e.mood)),
      energy: avg(list.map((e) => e.energy)),
      pain: avg(list.map((e) => e.pain)),
      sleep: avg(list.map((e) => e.sleep_hours)),
      entries: list.length,
    });
  }
  return out;
}

/** Most frequent symptoms in a set of entries. */
export function topSymptoms(entries: DiaryEntry[], limit = 8): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    for (const s of e.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Measurement series for charts (oldest first). */
export function measurementSeries(
  items: Measurement[],
  kind: MeasurementKind
): { ts: number; label: string; value: number; value2: number | null }[] {
  return items
    .filter((m) => m.kind === kind)
    .map((m) => {
      const d = new Date(m.measured_at);
      return {
        ts: d.getTime(),
        label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        value: m.value,
        value2: m.value2,
      };
    })
    .sort((a, b) => a.ts - b.ts);
}

/** Parse "8:30 am"-style free text into HH:MM, or null. */
export function normaliseTime(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}
