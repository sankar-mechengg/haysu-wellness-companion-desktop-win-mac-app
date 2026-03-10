import { useState, useCallback } from "react";
import PopupContainer from "./PopupContainer";
import ProgressRing from "../common/ProgressRing";
import Button from "../common/Button";
import { api } from "../../lib/tauriApi";
import { formatWaterMl, waterProgress } from "../../lib/waterCalc";
import { randomMessage, WATER_MESSAGES } from "../../lib/constants";
import { useAppStore } from "../../store/appStore";

interface WaterPopupProps {
  onDismiss: () => void;
  todayMl?: number;
  goalMl?: number;
}

export default function WaterPopup({
  onDismiss,
  todayMl = 0,
  goalMl = 2450,
}: WaterPopupProps) {
  const [responded, setResponded] = useState(false);
  const [message] = useState(() => randomMessage(WATER_MESSAGES));
  const soundEnabled = useAppStore((s) => s.soundEnabled);

  const handleConfirm = useCallback(async () => {
    setResponded(true);
    try {
      await api.logWater(true, 250);
    } catch (e) {
      console.error("Failed to log water:", e);
    }
    setTimeout(onDismiss, 800);
  }, [onDismiss]);

  const handleSkip = useCallback(async () => {
    setResponded(true);
    try {
      await api.logWater(false, 0);
    } catch (e) {
      console.error("Failed to log water skip:", e);
    }
    setTimeout(onDismiss, 400);
  }, [onDismiss]);

  const progress = waterProgress(todayMl, goalMl);

  return (
    <PopupContainer
      onDismiss={onDismiss}
      colorAccent="#60b8ff"
      soundEnabled={soundEnabled}
    >
      <div className="flex items-start gap-4">
        {/* Progress ring */}
        <ProgressRing
          progress={progress}
          size={56}
          strokeWidth={5}
          color="#60b8ff"
          trackColor="#e8f4ff"
        >
          <span className="text-xs font-bold text-water">💧</span>
        </ProgressRing>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
            Water Reminder
          </h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed">
            {message}
          </p>
          <p className="text-xs text-water font-medium mt-1.5">
            {formatWaterMl(todayMl)} / {formatWaterMl(goalMl)} today
          </p>
        </div>
      </div>

      {/* Actions */}
      {!responded ? (
        <div className="flex gap-2 mt-4">
          <Button
            variant="water"
            size="sm"
            onClick={handleConfirm}
            fullWidth
          >
            ✅ I drank water
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
          >
            ⏭️ Skip
          </Button>
        </div>
      ) : (
        <div className="mt-4 text-center">
          <p className="text-xs text-move font-medium animate-fade-in">
            ✓ Logged! Keep it up 💪
          </p>
        </div>
      )}
    </PopupContainer>
  );
}
