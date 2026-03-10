import { useMemo } from "react";
import PopupContainer from "./PopupContainer";
import IconBadge from "../common/IconBadge";
import Button from "../common/Button";
import { useAppStore } from "../../store/appStore";
import { api } from "../../lib/tauriApi";
import { randomMessage, POMODORO_WORK_COMPLETE_MESSAGES, POMODORO_BREAK_COMPLETE_MESSAGES } from "../../lib/constants";

interface PomodoroPopupProps {
  onDismiss: () => void;
  eventType?: string; // "work_complete" | "break_complete"
}

export default function PomodoroPopup({
  onDismiss,
  eventType = "work_complete",
}: PomodoroPopupProps) {
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const pomodoroSession = useAppStore((s) => s.pomodoroSession);
  const isWorkComplete = eventType === "work_complete";

  const message = useMemo(() => {
    return isWorkComplete
      ? randomMessage(POMODORO_WORK_COMPLETE_MESSAGES)
      : randomMessage(POMODORO_BREAK_COMPLETE_MESSAGES);
  }, [isWorkComplete]);

  const handleAction = async () => {
    if (!isWorkComplete) {
      // Break is over — start next work session
      try {
        await api.startPomodoro();
      } catch (e) {
        console.error("Failed to start pomodoro:", e);
      }
    }
    onDismiss();
  };

  return (
    <PopupContainer
      onDismiss={onDismiss}
      colorAccent="#ff7b7b"
      soundEnabled={soundEnabled}
    >
      <div className="flex items-start gap-4">
        <IconBadge
          icon={<span>{isWorkComplete ? "☕" : "🎯"}</span>}
          color="tomato"
          size="md"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
            {isWorkComplete ? "Work Session Complete!" : "Break Time Over!"}
          </h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed">
            {message}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-tomato font-medium">
              🍅 Session {pomodoroSession + 1}
            </span>
            {isWorkComplete && (
              <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                Time for a {pomodoroSession >= 3 ? "long" : "short"} break
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          variant="tomato"
          size="sm"
          onClick={handleAction}
          fullWidth
        >
          {isWorkComplete ? "☕ Start Break" : "🎯 Start Focusing"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </PopupContainer>
  );
}
