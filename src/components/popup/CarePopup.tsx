import { useCallback, useState } from "react";
import PopupContainer, { type PopupAction } from "./PopupContainer";
import { api, type CareReminderData } from "../../lib/api";

const ACCENT = "#f5b53f";

export default function CarePopup({
  data,
  onDone,
}: {
  data: CareReminderData;
  onDone: () => void;
}) {
  const [state, setState] = useState<"idle" | "done">("idle");

  const done = useCallback(async () => {
    if (state !== "idle") return;
    setState("done");
    await api.careDone(data.id).catch(console.error);
    setTimeout(onDone, 700);
  }, [state, data.id, onDone]);

  const later = useCallback(async () => {
    await api.careSnooze(data.id, 1).catch(console.error);
    onDone();
  }, [data.id, onDone]);

  const openIn = useCallback(async () => {
    await api.showWindow("dashboard").catch(() => {});
    onDone();
  }, [onDone]);

  const openLabel =
    data.kind === "photo_check"
      ? "Open camera"
      : data.kind === "diary"
        ? "Open diary"
        : data.kind === "measurement"
          ? "Log it"
          : "Open Haysu";

  const actions: PopupAction[] =
    state === "idle"
      ? [
          { label: "Done", onClick: done, hotkey: "Enter" },
          { label: openLabel, onClick: openIn, variant: "ghost", hotkey: "o" },
          { label: "Tomorrow", onClick: later, variant: "ghost", hotkey: "Escape" },
        ]
      : [{ label: "Nice", onClick: onDone, hotkey: "Enter" }];

  const every =
    data.interval_days === 1
      ? "daily"
      : data.interval_days === 7
        ? "weekly"
        : `every ${data.interval_days} days`;

  return (
    <PopupContainer accent={ACCENT} onDone={onDone} actions={actions}>
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${ACCENT}22` }}
        >
          {data.icon || "✨"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            {state === "done" ? "Logged. Routine kept." : "Time for a little self-care"}
          </h3>
          <p className="text-base font-bold mt-0.5 text-amber">{data.name}</p>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
            {every}
            {data.last_done ? ` · last done ${data.last_done}` : " · first time"}
            {data.notes && ` · ${data.notes}`}
          </p>
        </div>
      </div>
    </PopupContainer>
  );
}
