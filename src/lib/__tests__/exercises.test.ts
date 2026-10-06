import { describe, expect, it } from "vitest";
import {
  EXERCISES,
  getExerciseById,
  getExercisesForWorkStyle,
  getRandomExercise,
} from "../exercises";

describe("exercise catalogue", () => {
  it("has unique ids", () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("matches the id list compiled into the Rust scheduler", () => {
    // Keep in sync with EXERCISES_ALL in src-tauri/src/scheduler/mod.rs.
    expect(EXERCISES.length).toBe(40);
    const vigorousOrStanding = [
      "side_bends",
      "hip_flexor_stretch",
      "wall_sit",
      "standing_quad_stretch",
      "knee_lifts",
      "standing_side_leg_raise",
      "lions_breath",
    ];
    for (const id of vigorousOrStanding) {
      expect(getExerciseById(id)?.suitable_for).not.toContain("sedentary");
    }
    for (const e of EXERCISES) {
      if (!vigorousOrStanding.includes(e.id)) {
        expect(e.suitable_for).toContain("sedentary");
      }
    }
  });

  it("filters by work style", () => {
    expect(getExercisesForWorkStyle("sedentary").length).toBe(33);
    expect(getExercisesForWorkStyle("active").length).toBe(40);
  });

  it("random picks are suitable", () => {
    for (let i = 0; i < 50; i++) {
      expect(getRandomExercise("sedentary").suitable_for).toContain("sedentary");
    }
  });
});
