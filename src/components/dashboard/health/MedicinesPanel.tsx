import { useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import Card from "../../common/Card";
import Button from "../../common/Button";
import { toast } from "../../common/Toast";
import MedicineForm from "./MedicineForm";
import { useAdherence, useDoseSchedule, useMedicines } from "../../../hooks/useHealth";
import { api, errorMessage, type DoseSlot, type Medicine } from "../../../lib/api";
import { addDays, localDateString, parseLocalDate, relativeDay } from "../../../lib/format";
import { doseStatusMeta, slotTime } from "../../../lib/health";
import { WEEKDAYS } from "../../../lib/constants";

export default function MedicinesPanel() {
  const [offset, setOffset] = useState(0);
  const date = localDateString(addDays(new Date(), offset));
  const { data: schedule } = useDoseSchedule(date);
  const { data: medicines } = useMedicines();
  const { data: adherence } = useAdherence(7);
  const [editing, setEditing] = useState<Medicine | "new" | null>(null);

  const setStatus = async (slot: DoseSlot, status: "taken" | "skipped" | "pending") => {
    try {
      await api.logDose(slot.medicine_id, slot.scheduled_at, status);
      if (status === "taken") toast.success(`${slot.name} marked as taken`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async (m: Medicine) => {
    const ok = await ask(`Delete ${m.name} and its dose history?`, {
      title: "Delete medicine",
      kind: "warning",
      okLabel: "Delete",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    try {
      await api.deleteMedicine(m.id);
      toast.info(`${m.name} removed`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const navBtn =
    "h-7 px-2.5 rounded-lg text-xs font-medium text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark disabled:opacity-30";
  const small =
    "h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-haysu-300";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      {/* Schedule */}
      <Card padding="md" className="xl:col-span-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              {relativeDay(date)}'s doses
            </h3>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              {parseLocalDate(date).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className={navBtn} onClick={() => setOffset((o) => o - 1)}>
              ←
            </button>
            <button
              type="button"
              className={navBtn}
              onClick={() => setOffset(0)}
              disabled={offset === 0}
            >
              Today
            </button>
            <button
              type="button"
              className={navBtn}
              onClick={() => setOffset((o) => o + 1)}
              disabled={offset >= 14}
            >
              →
            </button>
          </div>
        </div>

        {schedule.length === 0 ? (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center py-8">
            {medicines.length === 0
              ? "No medicines yet. Add one on the right and Haysu will remind you."
              : "Nothing scheduled for this day."}
          </p>
        ) : (
          <ul className="divide-y divide-border/50 dark:divide-border-dark/50">
            {schedule.map((s) => {
              const meta = doseStatusMeta(s.status);
              const done = s.status === "taken" || s.status === "skipped" || s.status === "missed";
              const actionable = offset <= 0 && s.status !== "upcoming";
              return (
                <li
                  key={`${s.medicine_id}-${s.scheduled_at}`}
                  className="flex items-center gap-3 py-2"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-mono text-xs text-text-secondary dark:text-text-secondary-dark w-11 tabular-nums">
                    {slotTime(s.scheduled_at)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        s.status === "skipped" || s.status === "missed"
                          ? "text-text-secondary dark:text-text-secondary-dark"
                          : "text-text-primary dark:text-text-primary-dark"
                      }`}
                    >
                      {s.name}
                      {s.dose && (
                        <span className="text-xs font-normal text-text-secondary dark:text-text-secondary-dark">
                          {" "}
                          · {s.dose}
                        </span>
                      )}
                    </p>
                    {s.instructions && (
                      <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark truncate">
                        {s.instructions}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 h-6 inline-flex items-center rounded-md text-[11px] font-medium ${meta.cls}`}
                  >
                    {meta.icon} {meta.label}
                  </span>
                  {actionable &&
                    (done ? (
                      <button
                        type="button"
                        className={`${small} text-text-secondary dark:text-text-secondary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark`}
                        onClick={() => setStatus(s, "pending")}
                        title="Undo"
                      >
                        Undo
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`${small} bg-move/15 text-move hover:bg-move/25`}
                          onClick={() => setStatus(s, "taken")}
                        >
                          Taken
                        </button>
                        <button
                          type="button"
                          className={`${small} text-text-secondary dark:text-text-secondary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark`}
                          onClick={() => setStatus(s, "skipped")}
                        >
                          Skip
                        </button>
                      </>
                    ))}
                </li>
              );
            })}
          </ul>
        )}

        {adherence && adherence.scheduled > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50 dark:border-border-dark/50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-text-secondary dark:text-text-secondary-dark">
                Last 7 days · {adherence.taken} of {adherence.scheduled} doses taken
              </span>
              <span className="font-semibold text-text-primary dark:text-text-primary-dark tabular-nums">
                {adherence.adherence_pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-border/40 dark:bg-border-dark/40 overflow-hidden flex">
              <div
                className="h-full bg-move"
                style={{ width: `${(adherence.taken / adherence.scheduled) * 100}%` }}
              />
              <div
                className="h-full bg-tomato/70"
                style={{ width: `${(adherence.missed / adherence.scheduled) * 100}%` }}
              />
              <div
                className="h-full bg-border dark:bg-border-dark"
                style={{ width: `${(adherence.skipped / adherence.scheduled) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1">
              <span className="text-move">■</span> taken · <span className="text-tomato">■</span>{" "}
              missed · <span>■</span> skipped
            </p>
          </div>
        )}
      </Card>

      {/* Medicines */}
      <Card padding="md" className="xl:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            Your medicines
          </h3>
          {editing === null && (
            <Button size="sm" onClick={() => setEditing("new")}>
              + Add
            </Button>
          )}
        </div>

        {editing !== null && (
          <MedicineForm
            medicine={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}

        {editing === null && medicines.length === 0 && (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark py-6 text-center">
            Add the medicines you take and when. Reminders fire even during Do Not Disturb.
          </p>
        )}

        {editing === null && (
          <ul className="space-y-2">
            {medicines.map((m) => (
              <li
                key={m.id}
                className={`rounded-xl border border-border/60 dark:border-border-dark/60 p-3 ${
                  m.active ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark truncate">
                      {m.name}
                      {!m.active && (
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
                          paused
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
                      {m.dose && `${m.dose} · `}
                      {m.times.join(", ")} ·{" "}
                      {m.days.length === 7
                        ? "every day"
                        : m.days.map((d) => WEEKDAYS.find((w) => w.id === d)?.short).join(" ")}
                    </p>
                    {m.instructions && (
                      <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark truncate">
                        {m.instructions}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="text-[11px] text-haysu-500 hover:text-haysu-600 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    className="text-[11px] text-text-secondary hover:text-tomato font-medium"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
