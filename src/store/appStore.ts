import { create } from "zustand";

export type PomodoroPhase = "idle" | "work" | "short_break" | "long_break";
export type ThemeMode = "light" | "dark";
export type ReminderType = "water" | "movement" | "pomodoro";

interface TimerTick {
  remaining_secs: number;
  total_secs: number;
}

interface AppState {
  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // DND
  dndEnabled: boolean;
  toggleDnd: () => void;
  setDnd: (enabled: boolean) => void;

  // Timer states
  waterTimer: TimerTick;
  movementTimer: TimerTick;
  pomodoroTimer: TimerTick;
  setWaterTimer: (tick: TimerTick) => void;
  setMovementTimer: (tick: TimerTick) => void;
  setPomodoroTimer: (tick: TimerTick) => void;

  // Pomodoro phase
  pomodoroPhase: PomodoroPhase;
  pomodoroSession: number;
  setPomodoroPhase: (phase: PomodoroPhase) => void;
  setPomodoroSession: (session: number) => void;

  // Active reminder (for popup)
  activeReminder: {
    type: ReminderType;
    message: string;
    data?: string;
  } | null;
  setActiveReminder: (reminder: AppState["activeReminder"]) => void;
  clearReminder: () => void;

  // Widget visibility
  widgetVisible: boolean;
  setWidgetVisible: (visible: boolean) => void;

  // Sound
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  // Onboarding
  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;

  // User profile summary
  userName: string;
  workStyle: string;
  dailyWaterMl: number;
  setUserInfo: (name: string, workStyle: string, dailyWaterMl: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Theme
  theme: "light",
  setTheme: (theme) => set({ theme }),

  // DND
  dndEnabled: false,
  toggleDnd: () => set((state) => ({ dndEnabled: !state.dndEnabled })),
  setDnd: (enabled) => set({ dndEnabled: enabled }),

  // Timers
  waterTimer: { remaining_secs: 30 * 60, total_secs: 30 * 60 },
  movementTimer: { remaining_secs: 45 * 60, total_secs: 45 * 60 },
  pomodoroTimer: { remaining_secs: 25 * 60, total_secs: 25 * 60 },
  setWaterTimer: (tick) => set({ waterTimer: tick }),
  setMovementTimer: (tick) => set({ movementTimer: tick }),
  setPomodoroTimer: (tick) => set({ pomodoroTimer: tick }),

  // Pomodoro
  pomodoroPhase: "idle",
  pomodoroSession: 0,
  setPomodoroPhase: (phase) => set({ pomodoroPhase: phase }),
  setPomodoroSession: (session) => set({ pomodoroSession: session }),

  // Active reminder
  activeReminder: null,
  setActiveReminder: (reminder) => set({ activeReminder: reminder }),
  clearReminder: () => set({ activeReminder: null }),

  // Widget
  widgetVisible: true,
  setWidgetVisible: (visible) => set({ widgetVisible: visible }),

  // Sound
  soundEnabled: true,
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

  // Onboarding
  onboardingComplete: false,
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),

  // User
  userName: "",
  workStyle: "sedentary",
  dailyWaterMl: 2450,
  setUserInfo: (name, workStyle, dailyWaterMl) =>
    set({ userName: name, workStyle, dailyWaterMl }),
}));
