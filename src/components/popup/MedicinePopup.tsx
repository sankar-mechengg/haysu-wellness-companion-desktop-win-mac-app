import { useCallback, useState } from "react";
import PopupContainer, { type PopupAction } from "./PopupContainer";
import { api, type MedicineReminderData } from "../../lib/api";
import { slotTime } from "../../lib/health";
import { useConfig } from "../../store/appStore";

export default function MedicinePopup({
  data,
  onDone,
}: {
  data: MedicineReminderData;
  onDone: () => void;
}) {
  const config = useConfig();
  const [state, setState] = useState<"idle" | "taken" | "skipped">("idle");
  const accent = data.color || "#c084fc";

  const finish = useCallback(
    (next: "taken" | "skipped") => {
      setState(next);
      setTimeout(onDone, next === "taken" ? 800 : 300);
    },
    [onDone]
  );

  const taken = useCallback(async () => {
    if (state !== "idle") return;
    try {
      await api.logDose(data.medicine_id, data.scheduled_at, "taken");
    } catch (e) {
      console.error(e);
    }
    finish("taken");
  }, [state, data, finish]);

  const skip = useCallback(async () => {
    if (state !== "idle") return;
    try {
      await api.logDose(data.medicine_id, data.scheduled_at, "skipped");
    } catch (e) {
      console.error(e);
    }
    finish("skipped");
  }, [state, data, finish]);

  const snooze = useCallback(async () => {
    await api.snoozeDose(data.medicine_id, data.scheduled_at).catch(console.error);
    onDone();
  }, [data, onDone]);

  const actions: PopupAction[] =
    state === "idle"
      ? [
          { label: "Taken", onClick: taken, hotkey: "Enter" },
          {
            label: `Snooze ${config?.snooze_minutes ?? 5}m`,
            onClick: snooze,
            variant: "ghost",
            hotkey: "s",
          },
          { label: "Skip", onClick: skip, variant: "ghost", hotkey: "Escape" },
        ]
      : [{ label: "OK", onClick: onDone, hotkey: "Enter" }];

  return (
    <PopupContainer accent={accent} onDone={onDone} actions={actions} holdTimer>
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${accent}22` }}
        >
          💊
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            {state === "taken"
              ? "Logged. Nicely done."
              : state === "skipped"
                ? "Skipped this dose."
                : data.first
                  ? "Time for your medicine"
                  : "Reminder: medicine still due"}
          </h3>
          <p className="text-base font-bold mt-0.5" style={{ color: accent }}>
            {data.name}
            {data.dose && (
              <span className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                {" "}
                · {data.dose}
              </span>
            )}
          </p>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
            Scheduled for {slotTime(data.scheduled_at)}
            {data.instructions && ` · ${data.instructions}`}
          </p>
        </div>
      </div>
    </PopupContainer>
  );
}
