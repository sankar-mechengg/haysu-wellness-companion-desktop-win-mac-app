import { useState, useEffect, useCallback } from "react";
import Button from "../common/Button";
import Slider from "../common/Slider";
import Card from "../common/Card";
import { useSettings } from "../../hooks/useSettings";
import { api } from "../../lib/tauriApi";
import { ADAPTIVE_INTERVALS } from "../../lib/constants";
import { useAppStore } from "../../store/appStore";

export default function ReminderSettings() {
  const { settings, loading, updateSetting } = useSettings();
  const [waterMin, setWaterMin] = useState(30);
  const [moveMin, setMoveMin] = useState(45);
  const [waterMl, setWaterMl] = useState(250);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const workStyle = useAppStore((s) => s.workStyle) as keyof typeof ADAPTIVE_INTERVALS;

  useEffect(() => {
    if (settings) {
      setWaterMin(parseInt(settings.water_interval_min) || 30);
      setMoveMin(parseInt(settings.movement_interval_min) || 45);
      setWaterMl(parseInt(settings.water_amount_ml) || 250);
    }
  }, [settings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateSetting("water_interval_min", String(waterMin));
      await updateSetting("movement_interval_min", String(moveMin));
      await updateSetting("water_amount_ml", String(waterMl));
      await api.setWaterInterval(waterMin);
      await api.setMovementInterval(moveMin);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save reminder settings:", e);
    } finally {
      setSaving(false);
    }
  }, [waterMin, moveMin, waterMl, updateSetting]);

  const handleResetAdaptive = useCallback(() => {
    const adaptive = ADAPTIVE_INTERVALS[workStyle] || ADAPTIVE_INTERVALS.moderate;
    setWaterMin(adaptive.water);
    setMoveMin(adaptive.movement);
  }, [workStyle]);

  if (loading) {
    return <p className="text-sm text-text-secondary dark:text-text-secondary-dark py-4">Loading...</p>;
  }

  const hoursPerDay = 8;
  const waterCount = Math.floor((hoursPerDay * 60) / waterMin);
  const moveCount = Math.floor((hoursPerDay * 60) / moveMin);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Reminders</h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
            Adjust how often Haysu reminds you
          </p>
        </div>
        <button
          onClick={handleResetAdaptive}
          className="text-xs text-haysu-500 hover:text-haysu-600 font-medium"
        >
          Reset to adaptive
        </button>
      </div>

      <Card variant="water" padding="md">
        <div className="flex items-center gap-2 mb-3">
          <span>💧</span>
          <h4 className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Water Reminders</h4>
        </div>
        <Slider
          value={waterMin}
          onChange={setWaterMin}
          min={10}
          max={90}
          step={5}
          label="Interval"
          unit=" min"
        />
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-2">
          ≈ {waterCount} reminders per 8-hour day
        </p>
        <div className="mt-3">
          <Slider
            value={waterMl}
            onChange={setWaterMl}
            min={100}
            max={500}
            step={50}
            label="Amount per reminder"
            unit=" ml"
          />
        </div>
      </Card>

      <Card variant="move" padding="md">
        <div className="flex items-center gap-2 mb-3">
          <span>🏃</span>
          <h4 className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Movement Reminders</h4>
        </div>
        <Slider
          value={moveMin}
          onChange={setMoveMin}
          min={15}
          max={120}
          step={5}
          label="Interval"
          unit=" min"
        />
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-2">
          ≈ {moveCount} reminders per 8-hour day
        </p>
      </Card>

      <Button variant="primary" size="md" fullWidth onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : saved ? "✓ Applied!" : "Save & Apply"}
      </Button>
    </div>
  );
}
