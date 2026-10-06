import { useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import Card from "../../common/Card";
import Button from "../../common/Button";
import Toggle from "../../common/Toggle";
import { toast } from "../../common/Toast";
import { useCareRoutines } from "../../../hooks/useCare";
import {
  api,
  errorMessage,
  type CareKind,
  type CareRoutine,
  type CareRoutineInput,
} from "../../../lib/api";
import { addDays, localDateString, parseLocalDate, formatShortDate } from "../../../lib/format";

const input =
  "w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300";
const lbl = "block text-[11px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1";

function nextDue(r: CareRoutine): string {
  const due = r.last_done
    ? localDateString(addDays(parseLocalDate(r.last_done), r.interval_days))
    : localDateString();
  // A snooze pushes the date out without counting as "done".
  return r.snoozed_until && r.snoozed_until > due ? r.snoozed_until : due;
}

function dueLabel(r: CareRoutine): { text: string; cls: string } {
  const today = localDateString();
  const due = nextDue(r);
  if (!r.active)
    return { text: "paused", cls: "text-text-secondary dark:text-text-secondary-dark" };
  if (due < today) return { text: "overdue", cls: "text-tomato" };
  if (due === today) return { text: "today", cls: "text-amber" };
  const days = Math.round(
    (parseLocalDate(due).getTime() - parseLocalDate(today).getTime()) / 86400000
  );
  return {
    text: days === 1 ? "tomorrow" : `in ${days} days`,
    cls: "text-text-secondary dark:text-text-secondary-dark",
  };
}

const blank: CareRoutineInput = {
  name: "",
  icon: "✨",
  kind: "generic",
  interval_days: 7,
  time_of_day: "",
  active: true,
  notes: "",
  last_done: null,
};

export default function CarePanel({ onOpenCamera }: { onOpenCamera: () => void }) {
  const { routines, presets } = useCareRoutines();
  const [form, setForm] = useState<CareRoutineInput | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CareRoutineInput>(k: K, v: CareRoutineInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const existingNames = new Set(routines.map((r) => r.name.toLowerCase()));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await api.careSave(form);
      toast.success(form.id ? "Routine updated" : "Routine added");
      setForm(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: CareRoutine) => {
    const ok = await ask(`Remove "${r.name}"?`, {
      title: "Remove routine",
      kind: "warning",
      okLabel: "Remove",
    });
    if (!ok) return;
    try {
      await api.careDelete(r.id);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const done = async (r: CareRoutine) => {
    try {
      await api.careDone(r.id);
      toast.success(`${r.icon} ${r.name} done`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const addPreset = async (name: string) => {
    try {
      await api.careAddPreset(name);
      toast.success(`${name} added`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const sorted = [...routines].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return nextDue(a).localeCompare(nextDue(b));
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <Card padding="md" className="xl:col-span-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              Personal care routines
            </h3>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Haysu reminds you when each one comes around, even during Do Not Disturb.
            </p>
          </div>
          {!form && (
            <Button size="sm" onClick={() => setForm({ ...blank })}>
              + Custom
            </Button>
          )}
        </div>

        {form && (
          <div className="rounded-xl border border-haysu-300/60 dark:border-haysu-500/40 p-3 space-y-2.5 mb-3 animate-pop">
            <div className="grid grid-cols-[3rem_1fr] gap-2">
              <div>
                <label className={lbl}>Icon</label>
                <input
                  className={`${input} text-center`}
                  value={form.icon}
                  onChange={(e) => set("icon", e.target.value.slice(0, 4))}
                />
              </div>
              <div>
                <label className={lbl}>Name</label>
                <input
                  className={input}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Haircut"
                  maxLength={60}
                  autoFocus
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={lbl}>Every (days)</label>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  className={input}
                  value={form.interval_days}
                  onChange={(e) => set("interval_days", Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className={lbl}>Time (optional)</label>
                <input
                  type="time"
                  className={input}
                  value={form.time_of_day}
                  onChange={(e) => set("time_of_day", e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Type</label>
                <select
                  className={input}
                  value={form.kind}
                  onChange={(e) => set("kind", e.target.value as CareKind)}
                >
                  <option value="generic">Reminder</option>
                  <option value="photo_check">Photo check</option>
                  <option value="diary">Diary check-in</option>
                  <option value="measurement">Measurement</option>
                </select>
              </div>
            </div>
            <div>
              <label className={lbl}>Notes</label>
              <input
                className={input}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Optional"
                maxLength={200}
              />
            </div>
            <div className="flex items-center justify-between">
              <Toggle
                size="sm"
                label="Active"
                checked={form.active}
                onChange={(v) => set("active", v)}
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setForm(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={save} disabled={saving || !form.name.trim()}>
                  {saving ? "Saving…" : form.id ? "Save" : "Add"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {sorted.length === 0 && !form ? (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center py-6">
            No routines yet. Add a preset on the right to start.
          </p>
        ) : (
          <ul className="divide-y divide-border/50 dark:divide-border-dark/50">
            {sorted.map((r) => {
              const d = dueLabel(r);
              return (
                <li
                  key={r.id}
                  className={`group flex items-center gap-3 py-2 ${r.active ? "" : "opacity-60"}`}
                >
                  <span className="text-lg w-7 text-center">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark truncate">
                      {r.name}
                    </p>
                    <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
                      every {r.interval_days === 1 ? "day" : `${r.interval_days} days`}
                      {r.time_of_day && ` at ${r.time_of_day}`}
                      {r.last_done && ` · last ${formatShortDate(parseLocalDate(r.last_done))}`}
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium ${d.cls}`}>{d.text}</span>
                  {r.kind === "photo_check" && r.active && (
                    <button
                      type="button"
                      onClick={onOpenCamera}
                      className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-pill/15 text-pill hover:bg-pill/25"
                    >
                      📷 Check
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => done(r)}
                    className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-move/15 text-move hover:bg-move/25"
                  >
                    Done
                  </button>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: r.id,
                          name: r.name,
                          icon: r.icon,
                          kind: r.kind,
                          interval_days: r.interval_days,
                          time_of_day: r.time_of_day,
                          active: r.active,
                          notes: r.notes,
                          last_done: r.last_done,
                        })
                      }
                      className="text-[11px] text-haysu-500 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      className="text-[11px] text-text-secondary hover:text-tomato font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card padding="md" className="xl:col-span-2">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
          Presets
        </h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-3">
          One click to add. Daily routines start tomorrow so they don't nag right away.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const have = existingNames.has(p.name.toLowerCase());
            return (
              <button
                key={p.name}
                type="button"
                disabled={have}
                onClick={() => addPreset(p.name)}
                title={p.notes || `${p.name} every ${p.interval_days} day(s)`}
                className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                  have
                    ? "border-move/40 bg-move/10 text-move cursor-default"
                    : "border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text-primary dark:text-text-primary-dark hover:border-haysu-300 hover:-translate-y-0.5"
                }`}
              >
                {p.icon} {p.name}
                {have && " ✓"}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
