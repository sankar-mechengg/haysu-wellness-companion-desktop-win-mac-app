import { useMemo } from "react";
import PopupContainer, { type PopupAction } from "./PopupContainer";
import IconBadge from "../common/IconBadge";
import { api } from "../../lib/api";
import {
  POMODORO_BREAK_COMPLETE_MESSAGES,
  POMODORO_WORK_COMPLETE_MESSAGES,
  randomMessage,
} from "../../lib/constants";
import { formatMinutes } from "../../lib/format";
import { useConfig, useLive } from "../../store/appStore";

const ACCENT = "#ff7b7b";

export default function PomodoroPopup({
  eventType,
  onDone,
}: {
  eventType: "work_complete" | "break_complete";
  onDone: () => void;
}) {
  const live = useLive();
  const config = useConfig();
  const isWork = eventType === "work_complete";
  const message = useMemo(
    () =>
      randomMessage(isWork ? POMODORO_WORK_COMPLETE_MESSAGES : POMODORO_BREAK_COMPLETE_MESSAGES),
    [isWork]
  );

  const pomo = live?.pomodoro;
  // After a work phase the backend either auto-started the break (running) or
  // parked it as the queued phase (idle).
  const breakRunning = isWork && pomo?.running && pomo.phase !== "work";
  const queuedLabel =
    pomo?.queued === "long_break"
      ? "long break"
      : pomo?.queued === "short_break"
        ? "short break"
        : "focus";
  const queuedMinutes =
    pomo?.queued === "long_break"
      ? config?.pomodoro_long_break_min
      : pomo?.queued === "short_break"
        ? config?.pomodoro_short_break_min
        : config?.pomodoro_work_min;

  const startNext = async () => {
    await api.pomodoro("start").catch(() => {});
    onDone();
  };
  const stop = async () => {
    await api.pomodoro("stop").catch(() => {});
    onDone();
  };

  const actions: PopupAction[] = breakRunning
    ? [
        { label: "Enjoy the break", onClick: onDone, hotkey: "Enter" },
        {
          label: "Skip break",
          onClick: () => api.pomodoro("skip").then(onDone),
          variant: "ghost",
          hotkey: "k",
        },
        { label: "Stop", onClick: stop, variant: "ghost", hotkey: "Escape" },
      ]
    : [
        {
          label: `Start ${queuedLabel}${queuedMinutes ? ` (${formatMinutes(queuedMinutes)})` : ""}`,
          onClick: startNext,
          hotkey: "Enter",
        },
        { label: "Stop cycle", onClick: stop, variant: "ghost", hotkey: "Escape" },
      ];

  const sessionsDone = pomo?.session ?? 0;
  const total = config?.pomodoro_sessions_before_long ?? 4;

  return (
    <PopupContainer accent={ACCENT} onDone={onDone} actions={actions}>
      <div className="flex items-start gap-4">
        <IconBadge icon={<span>{isWork ? "☕" : "🎯"}</span>} color="tomato" size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            {isWork ? "Work session complete" : "Break time over"}
          </h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed mt-0.5">
            {message}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < (sessionsDone === 0 && isWork ? total : sessionsDone)
                    ? "bg-tomato"
                    : "bg-tomato/20"
                }`}
              />
            ))}
            <span className="text-[10px] text-tomato font-medium ml-1 tabular-nums">
              {sessionsDone === 0 && isWork ? total : sessionsDone}/{total}
            </span>
          </div>
        </div>
      </div>
    </PopupContainer>
  );
}
