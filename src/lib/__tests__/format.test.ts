import { describe, expect, it } from "vitest";
import {
  addDays,
  calculateDailyWater,
  formatClock,
  formatDurationShort,
  formatHotkey,
  formatWaterMl,
  hotkeyFromKeyboardEvent,
  localDateString,
  parseLocalDate,
  waterProgress,
  weekStart,
} from "../format";

describe("water", () => {
  it("calculates and clamps the daily goal like the Rust side", () => {
    expect(calculateDailyWater(70)).toBe(2450);
    expect(calculateDailyWater(30)).toBe(1500);
    expect(calculateDailyWater(200)).toBe(5000);
  });

  it("formats millilitres", () => {
    expect(formatWaterMl(250)).toBe("250ml");
    expect(formatWaterMl(1000)).toBe("1L");
    expect(formatWaterMl(2450)).toBe("2.5L");
  });

  it("caps progress at 100", () => {
    expect(waterProgress(500, 2000)).toBe(25);
    expect(waterProgress(3000, 2000)).toBe(100);
    expect(waterProgress(10, 0)).toBe(0);
  });
});

describe("time formatting", () => {
  it("formats clocks", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(3661)).toBe("1:01:01");
    expect(formatClock(-5)).toBe("00:00");
  });

  it("formats short durations", () => {
    expect(formatDurationShort(45)).toBe("45s");
    expect(formatDurationShort(120)).toBe("2m");
    expect(formatDurationShort(3900)).toBe("1h 5m");
  });
});

describe("local dates", () => {
  it("never uses UTC for the calendar date", () => {
    const d = new Date(2026, 2, 11, 1, 30); // 01:30 local on 11 March
    expect(localDateString(d)).toBe("2026-03-11");
  });

  it("parses YYYY-MM-DD as local midnight", () => {
    const d = parseLocalDate("2026-03-11");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(11);
    expect(d.getHours()).toBe(0);
  });

  it("finds Monday of the week", () => {
    // 11 March 2026 is a Wednesday.
    expect(localDateString(weekStart(new Date(2026, 2, 11)))).toBe("2026-03-09");
    // Sunday belongs to the week that started the previous Monday.
    expect(localDateString(weekStart(new Date(2026, 2, 15)))).toBe("2026-03-09");
    expect(localDateString(weekStart(new Date(2026, 2, 11), -1))).toBe("2026-03-02");
  });

  it("adds days across month boundaries", () => {
    expect(localDateString(addDays(new Date(2026, 0, 30), 3))).toBe("2026-02-02");
  });
});

describe("hotkeys", () => {
  it("renders platform-specific labels", () => {
    expect(formatHotkey("CmdOrCtrl+Shift+J", "windows")).toBe("Ctrl+Shift+J");
    expect(formatHotkey("CmdOrCtrl+Shift+J", "macos")).toBe("⌘⇧J");
    expect(formatHotkey("", "linux")).toBe("—");
  });

  it("builds a combo from a keyboard event", () => {
    const base = {
      key: "",
      code: "",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    };
    expect(hotkeyFromKeyboardEvent({ ...base, code: "KeyJ", ctrlKey: true, shiftKey: true })).toBe(
      "CmdOrCtrl+Shift+J"
    );
    expect(hotkeyFromKeyboardEvent({ ...base, code: "Digit1", altKey: true })).toBe("Alt+1");
    expect(hotkeyFromKeyboardEvent({ ...base, code: "F5", metaKey: true })).toBe("CmdOrCtrl+F5");
    expect(hotkeyFromKeyboardEvent({ ...base, code: "KeyJ" })).toBeNull();
    expect(hotkeyFromKeyboardEvent({ ...base, code: "ShiftLeft", shiftKey: true })).toBeNull();
  });
});
