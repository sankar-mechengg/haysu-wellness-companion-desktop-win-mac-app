import { useState, useCallback, useEffect } from "react";
import WaterPopup from "../components/popup/WaterPopup";
import MovementPopup from "../components/popup/MovementPopup";
import PomodoroPopup from "../components/popup/PomodoroPopup";
import { useTauriEvent } from "../hooks/useTauriEvent";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "../store/appStore";
import { api } from "../lib/tauriApi";

interface ReminderEvent {
  reminder_type: string;
  message: string;
  data?: string;
}

export default function PopupWindow() {
  const [activePopup, setActivePopup] = useState<{
    type: string;
    data?: string;
  } | null>(null);
  const [todayWaterMl, setTodayWaterMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(2450);
  const dndEnabled = useAppStore((s) => s.dndEnabled);

  // Load today's water stats
  const refreshWater = useCallback(async () => {
    try {
      const entries = await api.getWaterToday();
      const total = entries
        .filter((e) => e.consumed)
        .reduce((sum, e) => sum + e.amount_ml, 0);
      setTodayWaterMl(total);

      const profile = await api.getUserProfile();
      if (profile) {
        setWaterGoalMl(profile.daily_water_ml);
      }
    } catch {
      // Not critical
    }
  }, []);

  useEffect(() => {
    refreshWater();
  }, [refreshWater]);

  // Listen for reminder events from Rust backend
  useTauriEvent<ReminderEvent>("reminder", (payload) => {
    // Don't show if DND is enabled
    if (useAppStore.getState().dndEnabled) return;

    // Show popup window
    const appWindow = getCurrentWindow();
    appWindow.show().catch(() => {});
    appWindow.setFocus().catch(() => {});

    // Refresh water stats if it's a water reminder
    if (payload.reminder_type === "water") {
      refreshWater();
    }

    setActivePopup({
      type: payload.reminder_type,
      data: payload.data ?? undefined,
    });
  });

  // Listen for DND toggle
  useTauriEvent<string>("hotkey-action", (action) => {
    if (action === "toggle_dnd") {
      useAppStore.getState().toggleDnd();
    }
  });

  const handleDismiss = useCallback(() => {
    setActivePopup(null);
    const appWindow = getCurrentWindow();
    appWindow.hide().catch(() => {});
    // Refresh water after dismissal (might have logged)
    refreshWater();
  }, [refreshWater]);

  if (!activePopup) {
    return (
      <div className="h-screen w-screen bg-transparent" data-tauri-drag-region />
    );
  }

  switch (activePopup.type) {
    case "water":
      return (
        <WaterPopup
          onDismiss={handleDismiss}
          todayMl={todayWaterMl}
          goalMl={waterGoalMl}
        />
      );
    case "movement":
      return (
        <MovementPopup
          onDismiss={handleDismiss}
          exerciseId={activePopup.data}
        />
      );
    case "pomodoro":
      return (
        <PomodoroPopup
          onDismiss={handleDismiss}
          eventType={activePopup.data}
        />
      );
    default:
      return (
        <div className="h-screen w-screen bg-transparent" data-tauri-drag-region />
      );
  }
}
