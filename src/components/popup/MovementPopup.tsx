import { useState, useCallback, useMemo } from "react";
import PopupContainer from "./PopupContainer";
import IconBadge from "../common/IconBadge";
import Button from "../common/Button";
import { api } from "../../lib/tauriApi";
import { getExerciseById, getRandomExercise, CATEGORY_INFO, Exercise } from "../../lib/exercises";
import { randomMessage, MOVEMENT_MESSAGES } from "../../lib/constants";
import { useAppStore } from "../../store/appStore";

interface MovementPopupProps {
  onDismiss: () => void;
  exerciseId?: string;
}

export default function MovementPopup({
  onDismiss,
  exerciseId,
}: MovementPopupProps) {
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const workStyle = useAppStore((s) => s.workStyle) as "sedentary" | "moderate" | "active";
  const [responded, setResponded] = useState(false);
  const [message] = useState(() => randomMessage(MOVEMENT_MESSAGES));

  const exercise: Exercise = useMemo(() => {
    if (exerciseId) {
      const found = getExerciseById(exerciseId);
      if (found) return found;
    }
    return getRandomExercise(workStyle);
  }, [exerciseId, workStyle]);

  const categoryInfo = CATEGORY_INFO[exercise.category];

  const badgeColor = exercise.category === "upper_body" || exercise.category === "lower_body"
    ? "move"
    : exercise.category === "eyes"
    ? "purple"
    : "amber";

  const handleComplete = useCallback(async () => {
    setResponded(true);
    try {
      await api.logMovement(exercise.id, exercise.name, exercise.category, true);
    } catch (e) {
      console.error("Failed to log movement:", e);
    }
    setTimeout(onDismiss, 800);
  }, [exercise, onDismiss]);

  const handleSkip = useCallback(async () => {
    setResponded(true);
    try {
      await api.logMovement(exercise.id, exercise.name, exercise.category, false);
    } catch (e) {
      console.error("Failed to log movement skip:", e);
    }
    setTimeout(onDismiss, 400);
  }, [exercise, onDismiss]);

  return (
    <PopupContainer
      onDismiss={onDismiss}
      colorAccent="#7dd3a8"
      soundEnabled={soundEnabled}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <IconBadge
          icon={<span>{exercise.icon}</span>}
          color={badgeColor}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            {message}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
              {categoryInfo.emoji} {categoryInfo.label}
            </span>
            <span className="text-xs text-text-secondary dark:text-text-secondary-dark">•</span>
            <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
              {exercise.duration_sec}s
            </span>
            <span className="text-xs text-text-secondary dark:text-text-secondary-dark">•</span>
            <span className={`text-xs capitalize ${
              exercise.intensity === "light" ? "text-green-500" :
              exercise.intensity === "moderate" ? "text-amber-500" :
              "text-red-500"
            }`}>
              {exercise.intensity}
            </span>
          </div>
        </div>
      </div>

      {/* Exercise Card */}
      <div className="bg-move-light/50 dark:bg-move/5 rounded-xl p-3 mb-3">
        <h4 className="text-sm font-bold text-text-primary dark:text-text-primary-dark mb-1">
          {exercise.name}
        </h4>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed">
          {exercise.description}
        </p>
      </div>

      {/* Actions */}
      {!responded ? (
        <div className="flex gap-2">
          <Button
            variant="move"
            size="sm"
            onClick={handleComplete}
            fullWidth
          >
            ✅ Done!
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
        <div className="text-center">
          <p className="text-xs text-move font-medium animate-fade-in">
            ✓ Great job! Your body thanks you 🌟
          </p>
        </div>
      )}
    </PopupContainer>
  );
}
