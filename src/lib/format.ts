import { WATER_MAX_ML, WATER_MIN_ML, WATER_ML_PER_KG } from "./constants";

/** Recommended daily water intake in ml (weight × 35, clamped). Mirrors Rust. */
export function calculateDailyWater(weightKg: number): number {
  const raw = Math.floor(weightKg * WATER_ML_PER_KG);
  return Math.max(WATER_MIN_ML, Math.min(WATER_MAX_ML, raw));
}

export function formatWaterMl(ml: number): string {
  if (ml >= 1000) {
    const litres = ml / 1000;
    return `${Number.isInteger(litres) ? litres : litres.toFixed(1)}L`;
  }
  return `${ml}ml`;
}

export function waterProgress(consumedMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return Math.min(100, Math.round((consumedMl / goalMl) * 100));
}

/** MM:SS, or H:MM:SS above an hour. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = sec.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "12m", "1h 5m", "45s". */
export function formatDurationShort(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** Minutes as "25 min" or "1 h 30 min". */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Local calendar date as YYYY-MM-DD (never UTC). */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as a *local* date (avoids the UTC-midnight shift). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Monday of the week containing `d`, shifted by `offsetWeeks`. */
export function weekStart(d: Date = new Date(), offsetWeeks = 0): Date {
  const day = d.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff + offsetWeeks * 7);
  return monday;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function formatTimeOfDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function weekdayShort(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

/** "Today", "Yesterday", or a short date. */
export function relativeDay(dateStr: string): string {
  const today = localDateString();
  if (dateStr === today) return "Today";
  if (dateStr === localDateString(addDays(new Date(), -1))) return "Yesterday";
  return formatShortDate(parseLocalDate(dateStr));
}

/** Display a Tauri shortcut string ("CmdOrCtrl+Shift+J") for the current platform. */
export function formatHotkey(combo: string, platform: string): string {
  if (!combo) return "—";
  const mac = platform === "macos";
  return combo
    .split("+")
    .map((part) => {
      const p = part.trim();
      switch (p.toLowerCase()) {
        case "cmdorctrl":
        case "commandorcontrol":
          return mac ? "⌘" : "Ctrl";
        case "cmd":
        case "command":
        case "super":
        case "meta":
          return mac ? "⌘" : "Win";
        case "ctrl":
        case "control":
          return mac ? "⌃" : "Ctrl";
        case "alt":
        case "option":
          return mac ? "⌥" : "Alt";
        case "shift":
          return mac ? "⇧" : "Shift";
        case "space":
          return "Space";
        default:
          return p.length === 1 ? p.toUpperCase() : p;
      }
    })
    .join(mac ? "" : "+");
}

/** Build a Tauri shortcut string from a keyboard event, or null if incomplete. */
export function hotkeyFromKeyboardEvent(e: {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string | null {
  const mods: string[] = [];
  if (e.ctrlKey || e.metaKey) mods.push("CmdOrCtrl");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  if (mods.length === 0) return null;

  let key: string | null = null;
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
  else if (/^Digit[0-9]$/.test(e.code)) key = e.code.slice(5);
  else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(e.code)) key = e.code;
  else if (e.code === "Space") key = "Space";
  else if (/^Arrow(Up|Down|Left|Right)$/.test(e.code)) key = e.code.replace("Arrow", "");
  else if (
    ["Home", "End", "PageUp", "PageDown", "Insert", "Delete", "Enter", "Tab"].includes(e.code)
  )
    key = e.code;
  else if (
    [
      "Minus",
      "Equal",
      "BracketLeft",
      "BracketRight",
      "Semicolon",
      "Quote",
      "Comma",
      "Period",
      "Slash",
      "Backslash",
      "Backquote",
    ].includes(e.code)
  ) {
    key =
      {
        Minus: "-",
        Equal: "=",
        BracketLeft: "[",
        BracketRight: "]",
        Semicolon: ";",
        Quote: "'",
        Comma: ",",
        Period: ".",
        Slash: "/",
        Backslash: "\\",
        Backquote: "`",
      }[e.code] ?? null;
  }
  if (!key) return null;
  return [...mods, key].join("+");
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
