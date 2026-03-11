import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useTauriEvent } from "../../hooks/useTauriEvent";
import { useAppStore } from "../../store/appStore";
import { formatTime, nextReminderLabel } from "../../lib/waterCalc";
import { api } from "../../lib/tauriApi";
import AnimatedH from "../common/AnimatedH";

interface TimerTick {
  timer_type: string;
  remaining_secs: number;
  total_secs: number;
}

export default function FloatingWidget() {
  const [waterSecs, setWaterSecs] = useState(30 * 60);
  const [moveSecs, setMoveSecs] = useState(45 * 60);
  const [pomoSecs, setPomoSecs] = useState(0);
  const [pomoPhase, setPomoPhase] = useState("idle");
  const dndEnabled = useAppStore((s) => s.dndEnabled);
  const [expanded, setExpanded] = useState(false);

  const COMPACT_W = 240, COMPACT_H = 52;
  const EXPANDED_W = 240, EXPANDED_H = 148;

  // Resize the Tauri window when expanding/collapsing
  useEffect(() => {
    const win = getCurrentWindow();
    const [w, h] = expanded ? [EXPANDED_W, EXPANDED_H] : [COMPACT_W, COMPACT_H];
    win.setSize(new LogicalSize(w, h)).catch(() => {});
  }, [expanded]);

  // Load initial timer states and apply saved always-on-top setting
  useEffect(() => {
    const load = async () => {
      try {
        const [water, move, pomo, settings] = await Promise.all([
          api.getWaterTimerState(),
          api.getMovementTimerState(),
          api.getPomodoroState(),
          api.getAllSettings(),
        ]);
        setWaterSecs(water.remaining_secs);
        setMoveSecs(move.remaining_secs);
        setPomoSecs(pomo.remaining_secs);
        setPomoPhase(pomo.phase);
        const onTop = settings.widget_always_on_top !== "false";
        const win = getCurrentWindow();
        await win.setAlwaysOnTop(onTop);
      } catch {
        // Backend not ready yet
      }
    };
    load();
  }, []);

  // Listen for timer ticks
  useTauriEvent<TimerTick>("timer-tick", (payload) => {
    if (payload.timer_type === "water") {
      setWaterSecs(payload.remaining_secs);
    } else if (payload.timer_type === "movement") {
      setMoveSecs(payload.remaining_secs);
    } else if (payload.timer_type.startsWith("pomodoro_")) {
      setPomoSecs(payload.remaining_secs);
    }
  });

  // Listen for pomodoro phase changes
  useTauriEvent<{ phase: string; remaining_secs: number }>("pomodoro-phase", (payload) => {
    setPomoPhase(payload.phase);
    setPomoSecs(payload.remaining_secs);
  });

  // Listen for DND toggle from hotkey
  useTauriEvent<string>("hotkey-action", (action) => {
    if (action === "toggle_dnd") {
      useAppStore.getState().toggleDnd();
    } else if (action === "toggle_pomodoro") {
      api.togglePomodoro().catch(console.error);
    }
  });

  // Determine what to show as the primary timer
  const getNextReminder = useCallback(() => {
    if (pomoPhase !== "idle") {
      const pomoType = `pomodoro_${pomoPhase}`;
      return { type: pomoType, secs: pomoSecs };
    }

    if (waterSecs <= moveSecs) {
      return { type: "water", secs: waterSecs };
    }
    return { type: "movement", secs: moveSecs };
  }, [waterSecs, moveSecs, pomoSecs, pomoPhase]);

  const next = getNextReminder();
  const primaryLabel = nextReminderLabel(next.type, next.secs);

  // Handle pomodoro toggle on click
  const handlePomoClick = useCallback(async () => {
    try {
      await api.togglePomodoro();
    } catch (e) {
      console.error("Failed to toggle pomodoro:", e);
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-transparent flex items-center justify-center">
      <div
        className={`
          bg-white/92 dark:bg-surface-dark/92 backdrop-blur-xl
          rounded-2xl shadow-lg border border-white/30 dark:border-border-dark/50
          transition-all duration-300 ease-out select-none
          ${expanded ? "px-4 py-3" : "px-3 py-2"}
        `}
        style={{
          boxShadow: dndEnabled
            ? "0 4px 12px rgba(0,0,0,0.08)"
            : "0 4px 16px rgba(59,147,247,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        }}
        data-tauri-drag-region
      >
        {/* Compact view */}
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
          data-tauri-drag-region
        >
          {/* Logo */}
          <AnimatedH
            size={24}
            loading={pomoPhase !== "idle"}
            color={dndEnabled ? "#9ca3af" : "#3b93f7"}
          />

          {/* DND indicator */}
          {dndEnabled ? (
            <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              🔕 DND
            </span>
          ) : (
            <>
              {/* Next reminder label */}
              <span className="text-xs font-medium text-text-primary dark:text-text-primary-dark whitespace-nowrap">
                {primaryLabel}
              </span>
            </>
          )}
        </div>

        {/* Expanded view */}
        {expanded && !dndEnabled && (
          <div className="mt-2.5 pt-2.5 border-t border-border/50 dark:border-border-dark/50 space-y-1.5 animate-fade-in">
            {/* Water timer */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary dark:text-text-secondary-dark">💧 Water</span>
              <span className="font-mono font-medium text-water">{formatTime(waterSecs)}</span>
            </div>

            {/* Movement timer */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary dark:text-text-secondary-dark">🏃 Move</span>
              <span className="font-mono font-medium text-move">{formatTime(moveSecs)}</span>
            </div>

            {/* Pomodoro */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary dark:text-text-secondary-dark">🍅 Pomo</span>
              {pomoPhase === "idle" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePomoClick();
                  }}
                  className="text-tomato hover:underline font-medium"
                >
                  Start
                </button>
              ) : (
                <span className="font-mono font-medium text-tomato">
                  {formatTime(pomoSecs)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
