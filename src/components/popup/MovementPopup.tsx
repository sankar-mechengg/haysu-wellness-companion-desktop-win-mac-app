import { useCallback, useEffect, useMemo, useState } from "react";
import PopupContainer, { type PopupAction } from "./PopupContainer";
import ProgressRing from "../common/ProgressRing";
import { api } from "../../lib/api";
import {
  CATEGORY_INFO,
  getExerciseById,
  getRandomExercise,
  type Exercise,
} from "../../lib/exercises";
import { MOVEMENT_MESSAGES, randomMessage } from "../../lib/constants";
import { useConfig, useProfile } from "../../store/appStore";

const ACCENT = "#5cc99a";

export default function MovementPopup({
  exerciseId,
  onDone,
}: {
  exerciseId?: string;
  onDone: () => void;
}) {
  const config = useConfig();
  const profile = useProfile();
  const [message] = useState(() => randomMessage(MOVEMENT_MESSAGES));
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [left, setLeft] = useState(0);

  const exercise: Exercise = useMemo(
    () =>
      (exerciseId && getExerciseById(exerciseId)) ||
      getRandomExercise(profile?.work_style ?? "moderate"),
    [exerciseId, profile?.work_style]
  );
  const cat = CATEGORY_INFO[exercise.category];

  const logged = status === "done";

  const complete = useCallback(async () => {
    if (logged) return;
    setStatus("done");
    try {
      await api.logMovement(exercise.id, exercise.name, exercise.category, true);
    } catch (e) {
      console.error(e);
    }
    setTimeout(onDone, 900);
  }, [logged, exercise, onDone]);

  const skip = useCallback(async () => {
    if (logged) return;
    try {
      await api.logMovement(exercise.id, exercise.name, exercise.category, false);
    } catch (e) {
      console.error(e);
    }
    onDone();
  }, [logged, exercise, onDone]);

  const snooze = useCallback(async () => {
    await api.snoozeReminder("movement").catch(() => {});
    onDone();
  }, [onDone]);

  const start = useCallback(() => {
    setLeft(exercise.duration_sec);
    setStatus("running");
  }, [exercise.duration_sec]);

  // Exercise countdown.
  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(id);
          complete();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, complete]);

  const actions: PopupAction[] =
    status === "idle"
      ? [
          { label: `Start ${exercise.duration_sec}s timer`, onClick: start, hotkey: "Enter" },
          { label: "Done", onClick: complete, variant: "ghost", hotkey: "d" },
          { label: `Snooze`, onClick: snooze, variant: "ghost", hotkey: "s" },
          { label: "Skip", onClick: skip, variant: "ghost", hotkey: "Escape" },
        ]
      : status === "running"
        ? [
            { label: "Finish early", onClick: complete, hotkey: "Enter" },
            { label: "Skip", onClick: skip, variant: "ghost", hotkey: "Escape" },
          ]
        : [{ label: "Nice!", onClick: onDone, hotkey: "Enter" }];

  const ringProgress =
    status === "running"
      ? ((exercise.duration_sec - left) / exercise.duration_sec) * 100
      : status === "done"
        ? 100
        : 0;

  return (
    <PopupContainer
      accent={ACCENT}
      onDone={onDone}
      actions={actions}
      holdTimer={status === "running"}
    >
      <div className="flex items-start gap-4">
        <ProgressRing
          progress={ringProgress}
          size={60}
          strokeWidth={5}
          color={ACCENT}
          trackColor="#e8f8f0"
        >
          <span className="text-base">
            {status === "running" ? (
              <span className="font-mono text-xs font-bold text-move tabular-nums">{left}</span>
            ) : (
              exercise.icon
            )}
          </span>
        </ProgressRing>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            {status === "done" ? "Great job. Your body thanks you 🌟" : message}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-text-secondary dark:text-text-secondary-dark">
            <span>
              {cat.emoji} {cat.label}
            </span>
            <span>·</span>
            <span>{exercise.duration_sec}s</span>
            <span>·</span>
            <span
              className={`capitalize ${
                exercise.intensity === "light"
                  ? "text-move"
                  : exercise.intensity === "moderate"
                    ? "text-amber"
                    : "text-tomato"
              }`}
            >
              {exercise.intensity}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-move-light/70 dark:bg-move/10 p-3">
        <h4 className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
          {exercise.name}
        </h4>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed mt-0.5">
          {exercise.description}
        </p>
      </div>
      {config?.snooze_minutes && status === "idle" && (
        <p className="text-[10px] text-text-secondary/70 dark:text-text-secondary-dark/70 mt-2">
          Enter = start · D = done · S = snooze {config.snooze_minutes}m · Esc = skip
        </p>
      )}
    </PopupContainer>
  );
}
