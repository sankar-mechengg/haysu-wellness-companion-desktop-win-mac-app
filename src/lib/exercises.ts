export type ExerciseCategory = "upper_body" | "lower_body" | "eyes" | "breathing";
export type Intensity = "light" | "moderate" | "vigorous";
export type WorkStyle = "sedentary" | "moderate" | "active";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  intensity: Intensity;
  duration_sec: number;
  description: string;
  icon: string;
  suitable_for: WorkStyle[];
}

export const EXERCISES: Exercise[] = [
  // ─── UPPER BODY (12) ───
  {
    id: "neck_rolls",
    name: "Neck Rolls",
    category: "upper_body",
    intensity: "light",
    duration_sec: 30,
    description: "Slowly roll your head in a full circle — 5 times clockwise, then 5 counter-clockwise. Keep shoulders relaxed.",
    icon: "🔄",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "shoulder_shrugs",
    name: "Shoulder Shrugs",
    category: "upper_body",
    intensity: "light",
    duration_sec: 20,
    description: "Raise both shoulders up to your ears, hold for 2 seconds, then drop. Repeat 10 times.",
    icon: "⬆️",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "wrist_circles",
    name: "Wrist Circles",
    category: "upper_body",
    intensity: "light",
    duration_sec: 30,
    description: "Extend arms forward. Make slow circles with your wrists — 10 in each direction. Great for typing fatigue.",
    icon: "🔃",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "arm_cross_stretch",
    name: "Arm Cross Stretch",
    category: "upper_body",
    intensity: "light",
    duration_sec: 30,
    description: "Bring one arm across your chest, hold with opposite hand for 15 seconds. Switch arms.",
    icon: "💪",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "chest_opener",
    name: "Chest Opener",
    category: "upper_body",
    intensity: "moderate",
    duration_sec: 30,
    description: "Clasp hands behind your back, straighten arms and lift gently. Open your chest and hold 15 seconds.",
    icon: "🫁",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "upper_back_stretch",
    name: "Upper Back Stretch",
    category: "upper_body",
    intensity: "light",
    duration_sec: 30,
    description: "Clasp hands in front, round your upper back, push hands forward. Feel the stretch between shoulder blades. Hold 15s.",
    icon: "🔙",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "side_bends",
    name: "Side Bends",
    category: "upper_body",
    intensity: "moderate",
    duration_sec: 30,
    description: "Stand with feet hip-width. Raise one arm overhead and lean to the opposite side. Hold 10s each side.",
    icon: "↔️",
    suitable_for: ["moderate", "active"],
  },
  {
    id: "forearm_stretch",
    name: "Forearm Stretch",
    category: "upper_body",
    intensity: "light",
    duration_sec: 30,
    description: "Extend one arm, palm up. With other hand, gently pull fingers down. Hold 15s each arm. Relieves mouse strain.",
    icon: "✋",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "finger_spread",
    name: "Finger Spread & Squeeze",
    category: "upper_body",
    intensity: "light",
    duration_sec: 20,
    description: "Spread fingers wide for 5 seconds, then make a tight fist for 5 seconds. Repeat 5 times.",
    icon: "🖐️",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "trapezius_release",
    name: "Trapezius Release",
    category: "upper_body",
    intensity: "light",
    duration_sec: 30,
    description: "Tilt head to right, gently press with right hand. Hold 15 seconds. Switch sides. Releases neck tension.",
    icon: "🧘",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "seated_spinal_twist",
    name: "Seated Spinal Twist",
    category: "upper_body",
    intensity: "moderate",
    duration_sec: 30,
    description: "Sit tall, twist torso to the right placing left hand on right knee. Hold 15s. Switch sides.",
    icon: "🌀",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "shoulder_blade_squeeze",
    name: "Shoulder Blade Squeeze",
    category: "upper_body",
    intensity: "light",
    duration_sec: 20,
    description: "Sit tall, squeeze shoulder blades together as if holding a pencil between them. Hold 5s, repeat 8 times.",
    icon: "🎯",
    suitable_for: ["sedentary", "moderate", "active"],
  },

  // ─── LOWER BODY (12) ───
  {
    id: "calf_raises",
    name: "Standing Calf Raises",
    category: "lower_body",
    intensity: "moderate",
    duration_sec: 30,
    description: "Stand near desk for balance. Rise up on toes, hold 2 seconds, lower slowly. Repeat 15 times.",
    icon: "🦶",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "seated_leg_extensions",
    name: "Seated Leg Extensions",
    category: "lower_body",
    intensity: "light",
    duration_sec: 30,
    description: "Sit tall, extend one leg straight out until parallel with floor. Hold 5s. Alternate legs, 8 times each.",
    icon: "🦵",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "hip_flexor_stretch",
    name: "Hip Flexor Stretch",
    category: "lower_body",
    intensity: "moderate",
    duration_sec: 45,
    description: "Step one foot forward into a lunge. Keep back knee low, push hips forward gently. Hold 20s each side.",
    icon: "🏋️",
    suitable_for: ["moderate", "active"],
  },
  {
    id: "ankle_circles",
    name: "Ankle Circles",
    category: "lower_body",
    intensity: "light",
    duration_sec: 30,
    description: "Lift one foot off floor, draw slow circles with your toes. 10 each direction, then switch feet.",
    icon: "⭕",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "glute_squeeze",
    name: "Seated Glute Squeeze",
    category: "lower_body",
    intensity: "light",
    duration_sec: 20,
    description: "While seated, squeeze your glutes hard for 5 seconds, release. Repeat 10 times. No one will notice!",
    icon: "🍑",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "wall_sit",
    name: "Wall Sit",
    category: "lower_body",
    intensity: "vigorous",
    duration_sec: 45,
    description: "Lean against a wall, slide down until thighs are parallel to floor. Hold as long as comfortable, aim for 30s.",
    icon: "🧱",
    suitable_for: ["moderate", "active"],
  },
  {
    id: "standing_quad_stretch",
    name: "Standing Quad Stretch",
    category: "lower_body",
    intensity: "moderate",
    duration_sec: 30,
    description: "Stand on one leg, grab opposite ankle behind you. Pull gently toward glutes. Hold 15s each side.",
    icon: "🦩",
    suitable_for: ["moderate", "active"],
  },
  {
    id: "hamstring_stretch",
    name: "Seated Hamstring Stretch",
    category: "lower_body",
    intensity: "light",
    duration_sec: 30,
    description: "Sit at edge of chair, extend one leg straight. Lean forward from hips until you feel a stretch. Hold 15s each.",
    icon: "📐",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "toe_raises",
    name: "Toe Raises",
    category: "lower_body",
    intensity: "light",
    duration_sec: 20,
    description: "Seated or standing, lift toes while keeping heels on the ground. Hold 3 seconds, repeat 12 times.",
    icon: "👆",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "knee_lifts",
    name: "Standing Knee Lifts",
    category: "lower_body",
    intensity: "moderate",
    duration_sec: 30,
    description: "Stand tall, lift one knee toward chest. Alternate legs at a steady pace, 10 each side. Light cardio boost!",
    icon: "🏃",
    suitable_for: ["moderate", "active"],
  },
  {
    id: "figure_four_stretch",
    name: "Figure-Four Stretch",
    category: "lower_body",
    intensity: "light",
    duration_sec: 40,
    description: "Sit tall, cross one ankle over opposite knee. Gently lean forward. Hold 20s each side. Opens hips.",
    icon: "4️⃣",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "standing_side_leg_raise",
    name: "Standing Side Leg Raise",
    category: "lower_body",
    intensity: "moderate",
    duration_sec: 30,
    description: "Hold desk for balance. Lift one leg out to the side, hold 2s, lower. 10 each side.",
    icon: "🦿",
    suitable_for: ["moderate", "active"],
  },

  // ─── EYES (8) ───
  {
    id: "eye_20_20_20",
    name: "20-20-20 Rule",
    category: "eyes",
    intensity: "light",
    duration_sec: 20,
    description: "Look at something 20 feet away for 20 seconds. This resets your focusing muscles and reduces eye strain.",
    icon: "👀",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "eye_circles",
    name: "Eye Circles",
    category: "eyes",
    intensity: "light",
    duration_sec: 20,
    description: "Without moving your head, slowly roll your eyes in a full circle. 5 clockwise, 5 counter-clockwise.",
    icon: "🔵",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "palming",
    name: "Palming",
    category: "eyes",
    intensity: "light",
    duration_sec: 30,
    description: "Rub palms together to warm them, then cup over closed eyes. Relax and breathe for 30 seconds. Total darkness soothes eyes.",
    icon: "🤲",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "focus_shifting",
    name: "Focus Shifting",
    category: "eyes",
    intensity: "light",
    duration_sec: 30,
    description: "Hold a pen at arm's length. Focus on it for 5 seconds, then focus on something far away for 5 seconds. Repeat 5 times.",
    icon: "🔍",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "blinking_exercise",
    name: "Blinking Exercise",
    category: "eyes",
    intensity: "light",
    duration_sec: 20,
    description: "Blink rapidly 20 times, then close eyes for 10 seconds. Screen staring reduces blink rate by 60%. This resets it.",
    icon: "😑",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "figure_eight_tracking",
    name: "Figure-Eight Tracking",
    category: "eyes",
    intensity: "light",
    duration_sec: 30,
    description: "Imagine a giant figure 8 on the floor, 10 feet away. Slowly trace it with your eyes. 5 times each direction.",
    icon: "♾️",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "peripheral_awareness",
    name: "Peripheral Awareness",
    category: "eyes",
    intensity: "light",
    duration_sec: 20,
    description: "Look straight ahead. Without moving your eyes, notice what's in your peripheral vision. Hold awareness for 20 seconds.",
    icon: "🌐",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "eye_squeeze_release",
    name: "Eye Squeeze & Release",
    category: "eyes",
    intensity: "light",
    duration_sec: 20,
    description: "Squeeze eyes shut tightly for 3 seconds, then open wide for 3 seconds. Repeat 5 times. Relieves tension.",
    icon: "😤",
    suitable_for: ["sedentary", "moderate", "active"],
  },

  // ─── BREATHING (8) ───
  {
    id: "box_breathing",
    name: "Box Breathing",
    category: "breathing",
    intensity: "light",
    duration_sec: 60,
    description: "Inhale 4 seconds → Hold 4 seconds → Exhale 4 seconds → Hold 4 seconds. Repeat 4 cycles. Used by Navy SEALs.",
    icon: "📦",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "breathing_4_7_8",
    name: "4-7-8 Breathing",
    category: "breathing",
    intensity: "light",
    duration_sec: 60,
    description: "Inhale through nose for 4 seconds → Hold for 7 seconds → Exhale through mouth for 8 seconds. 3 cycles. Deeply calming.",
    icon: "🌊",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "deep_belly_breathing",
    name: "Deep Belly Breathing",
    category: "breathing",
    intensity: "light",
    duration_sec: 45,
    description: "Place hand on belly. Breathe in deeply through nose, expanding belly (not chest). Slow exhale. 8 breaths.",
    icon: "🫃",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "alternate_nostril",
    name: "Alternate Nostril Breathing",
    category: "breathing",
    intensity: "light",
    duration_sec: 60,
    description: "Close right nostril, inhale left. Close left, exhale right. Inhale right, close right, exhale left. 5 cycles.",
    icon: "👃",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "pursed_lip_breathing",
    name: "Pursed Lip Breathing",
    category: "breathing",
    intensity: "light",
    duration_sec: 30,
    description: "Inhale through nose for 2 seconds. Purse lips like blowing a candle, exhale slowly for 4 seconds. 6 breaths.",
    icon: "💨",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "lions_breath",
    name: "Lion's Breath",
    category: "breathing",
    intensity: "moderate",
    duration_sec: 20,
    description: "Inhale deeply through nose. Open mouth wide, stick out tongue, exhale forcefully with a 'HAAA'. 5 times. Releases tension.",
    icon: "🦁",
    suitable_for: ["moderate", "active"],
  },
  {
    id: "humming_breath",
    name: "Humming Bee Breath",
    category: "breathing",
    intensity: "light",
    duration_sec: 45,
    description: "Close eyes, inhale deeply. Exhale while humming 'mmm' with lips closed. Feel vibration in skull. 6 breaths.",
    icon: "🐝",
    suitable_for: ["sedentary", "moderate", "active"],
  },
  {
    id: "progressive_muscle_relaxation",
    name: "Progressive Muscle Relaxation",
    category: "breathing",
    intensity: "light",
    duration_sec: 90,
    description: "Tense each muscle group for 5s then release: fists → forearms → shoulders → face → core → legs. Full body reset.",
    icon: "🧊",
    suitable_for: ["sedentary", "moderate", "active"],
  },
];

// ─── Helpers ───

/** Get exercise by ID */
export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

/** Get exercises filtered by category */
export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
  return EXERCISES.filter((e) => e.category === category);
}

/** Get exercises suitable for a work style */
export function getExercisesForWorkStyle(workStyle: WorkStyle): Exercise[] {
  return EXERCISES.filter((e) => e.suitable_for.includes(workStyle));
}

/** Get a random exercise for a given work style */
export function getRandomExercise(workStyle: WorkStyle = "moderate"): Exercise {
  const suitable = getExercisesForWorkStyle(workStyle);
  return suitable[Math.floor(Math.random() * suitable.length)];
}

/** Get category display info */
export const CATEGORY_INFO: Record<ExerciseCategory, { label: string; emoji: string; color: string }> = {
  upper_body: { label: "Upper Body", emoji: "💪", color: "#60b8ff" },
  lower_body: { label: "Lower Body", emoji: "🦵", color: "#7dd3a8" },
  eyes: { label: "Eyes", emoji: "👀", color: "#c084fc" },
  breathing: { label: "Breathing", emoji: "🌬️", color: "#fbbf24" },
};
