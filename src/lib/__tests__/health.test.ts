import { describe, expect, it } from "vitest";
import {
  dailySeries,
  doseStatusMeta,
  formatMeasurement,
  groupByDate,
  normaliseTime,
  slotTime,
  slotToDate,
  topSymptoms,
} from "../health";
import { localDateString } from "../format";
import type { DiaryEntry, Measurement } from "../api";

const entry = (over: Partial<DiaryEntry>): DiaryEntry => ({
  id: 1,
  timestamp: "2026-03-11T10:00:00Z",
  date: "2026-03-11",
  mood: null,
  energy: null,
  sleep_hours: null,
  pain: null,
  symptoms: [],
  notes: "",
  condition_id: null,
  ...over,
});

describe("slots", () => {
  it("extracts the time and builds a local date", () => {
    expect(slotTime("2026-03-11 08:30")).toBe("08:30");
    const d = slotToDate("2026-03-11 08:30");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getHours()).toBe(8);
    expect(d.getMinutes()).toBe(30);
  });

  it("normalises typed times", () => {
    expect(normaliseTime("8")).toBe("08:00");
    expect(normaliseTime("8:30 pm")).toBe("20:30");
    expect(normaliseTime("12 am")).toBe("00:00");
    expect(normaliseTime("25:00")).toBeNull();
    expect(normaliseTime("soon")).toBeNull();
  });

  it("has metadata for every status", () => {
    for (const s of ["taken", "skipped", "missed", "snoozed", "pending", "upcoming"] as const) {
      expect(doseStatusMeta(s).label).toBeTruthy();
    }
  });
});

describe("diary helpers", () => {
  it("groups entries by date, newest first", () => {
    const g = groupByDate([
      entry({ id: 1, date: "2026-03-10" }),
      entry({ id: 2, date: "2026-03-11" }),
      entry({ id: 3, date: "2026-03-10" }),
    ]);
    expect(g.map((x) => x.date)).toEqual(["2026-03-11", "2026-03-10"]);
    expect(g[1].items.map((x) => x.id)).toEqual([1, 3]);
  });

  it("averages per day and pads missing days", () => {
    const today = localDateString();
    const s = dailySeries(
      [entry({ date: today, mood: 2, energy: 4 }), entry({ date: today, mood: 4, energy: null })],
      3
    );
    expect(s).toHaveLength(3);
    expect(s[2].date).toBe(today);
    expect(s[2].mood).toBe(3);
    expect(s[2].energy).toBe(4);
    expect(s[0].mood).toBeNull();
  });

  it("ranks symptoms", () => {
    const top = topSymptoms([
      entry({ symptoms: ["headache", "nausea"] }),
      entry({ symptoms: ["headache"] }),
    ]);
    expect(top[0]).toEqual({ name: "headache", count: 2 });
  });
});

describe("measurements", () => {
  it("formats blood pressure as a pair", () => {
    const m: Measurement = {
      id: 1,
      kind: "blood_pressure",
      value: 120,
      value2: 80,
      unit: "mmHg",
      measured_at: "2026-03-11T10:00:00Z",
      notes: "",
    };
    expect(formatMeasurement(m)).toBe("120/80 mmHg");
    expect(
      formatMeasurement({ ...m, kind: "weight", value: 72.456, value2: null, unit: "kg" })
    ).toBe("72.5 kg");
  });
});
