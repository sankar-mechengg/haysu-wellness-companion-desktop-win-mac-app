import { useState, useEffect, useCallback } from "react";
import Toggle from "../common/Toggle";
import Card from "../common/Card";
import AnimatedH from "../common/AnimatedH";
import { useSettings } from "../../hooks/useSettings";
import { useAppStore } from "../../store/appStore";
import { api } from "../../lib/tauriApi";

export default function GeneralSettings() {
  const { settings, updateSetting } = useSettings();
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const setSoundEnabled = useAppStore((s) => s.setSoundEnabled);
  const dndEnabled = useAppStore((s) => s.dndEnabled);
  const setDnd = useAppStore((s) => s.setDnd);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [loadingAutostart, setLoadingAutostart] = useState(true);

  useEffect(() => {
    api.isAutostartEnabled()
      .then((enabled) => {
        setAutostartEnabled(enabled);
        setLoadingAutostart(false);
      })
      .catch(() => setLoadingAutostart(false));
  }, []);

  const handleAutostart = useCallback(async (checked: boolean) => {
    setAutostartEnabled(checked);
    try {
      if (checked) {
        await api.enableAutostart();
      } else {
        await api.disableAutostart();
      }
      await updateSetting("autostart_enabled", String(checked));
    } catch (e) {
      console.error("Failed to toggle autostart:", e);
      setAutostartEnabled(!checked);
    }
  }, [updateSetting]);

  const handleSound = useCallback(async (checked: boolean) => {
    setSoundEnabled(checked);
    await updateSetting("sound_enabled", String(checked));
  }, [setSoundEnabled, updateSetting]);

  const handleDnd = useCallback(async (checked: boolean) => {
    setDnd(checked);
    await updateSetting("dnd_enabled", String(checked));
    // Pause/resume timers based on DND
    if (checked) {
      await api.pauseWaterTimer().catch(() => {});
      await api.pauseMovementTimer().catch(() => {});
    } else {
      await api.resumeWaterTimer().catch(() => {});
      await api.resumeMovementTimer().catch(() => {});
    }
  }, [setDnd, updateSetting]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">General</h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
          App behavior and system settings
        </p>
      </div>

      <Card padding="md" className="space-y-4">
        <Toggle
          checked={autostartEnabled}
          onChange={handleAutostart}
          label="Launch on startup"
          description="Start Haysu automatically when you log in"
          disabled={loadingAutostart}
        />
        <Toggle
          checked={soundEnabled}
          onChange={handleSound}
          label="Notification sound"
          description="Play a subtle chime when reminders appear"
        />
        <Toggle
          checked={dndEnabled}
          onChange={handleDnd}
          label="Do Not Disturb"
          description="Temporarily pause all reminders"
        />
      </Card>

      {/* DND warning */}
      {dndEnabled && (
        <Card variant="tomato" padding="sm">
          <p className="text-xs text-center text-tomato font-medium">
            🔕 DND is active — all reminders are paused
          </p>
        </Card>
      )}

      {/* App info */}
      <Card padding="md" className="text-center">
        <AnimatedH size={32} className="mx-auto mb-2" />
        <h4 className="text-sm font-bold text-text-primary dark:text-text-primary-dark">Haysu</h4>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
          Version 1.0.0
        </p>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Your desktop wellness companion
        </p>
        <p className="text-[10px] text-text-secondary/50 dark:text-text-secondary-dark/50 mt-3">
          Built with Tauri + React + Rust
        </p>
      </Card>
    </div>
  );
}
