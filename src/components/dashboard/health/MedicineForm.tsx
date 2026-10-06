import { useState } from "react";
import Button from "../../common/Button";
import Toggle from "../../common/Toggle";
import { toast } from "../../common/Toast";
import { api, errorMessage, type Medicine, type MedicineInput } from "../../../lib/api";
import { WEEKDAYS } from "../../../lib/constants";
import { MEDICINE_COLORS, normaliseTime } from "../../../lib/health";

const input =
  "w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300";
const label =
  "block text-[11px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1";

export default function MedicineForm({
  medicine,
  onClose,
}: {
  medicine: Medicine | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<MedicineInput>(() =>
    medicine
      ? {
          id: medicine.id,
          name: medicine.name,
          dose: medicine.dose,
          instructions: medicine.instructions,
          times: [...medicine.times],
          days: [...medicine.days],
          active: medicine.active,
          start_date: medicine.start_date,
          end_date: medicine.end_date,
          color: medicine.color,
        }
      : {
          name: "",
          dose: "",
          instructions: "",
          times: ["08:00"],
          days: [1, 2, 3, 4, 5, 6, 7],
          active: true,
          start_date: null,
          end_date: null,
          color: MEDICINE_COLORS[0],
        }
  );
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof MedicineInput>(k: K, v: MedicineInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addTime = () => {
    const t = normaliseTime(newTime);
    if (!t) {
      toast.error("Enter a time like 08:00 or 8 pm");
      return;
    }
    if (!form.times.includes(t)) set("times", [...form.times, t].sort());
    setNewTime("");
  };

  const toggleDay = (d: number) =>
    set(
      "days",
      form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d].sort()
    );

  const save = async () => {
    setSaving(true);
    try {
      await api.saveMedicine(form);
      toast.success(medicine ? "Medicine updated" : "Medicine added");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-haysu-300/60 dark:border-haysu-500/40 p-3 space-y-3 animate-pop">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className={label}>Name</label>
          <input
            className={input}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Metformin"
            maxLength={80}
            autoFocus
          />
        </div>
        <div>
          <label className={label}>Dose</label>
          <input
            className={input}
            value={form.dose}
            onChange={(e) => set("dose", e.target.value)}
            placeholder="500 mg · 1 tablet"
            maxLength={40}
          />
        </div>
        <div>
          <label className={label}>Instructions</label>
          <input
            className={input}
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            placeholder="with food"
            maxLength={120}
          />
        </div>
      </div>

      <div>
        <label className={label}>Times of day</label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {form.times.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 pl-2 pr-1 h-7 rounded-lg bg-haysu-100 dark:bg-haysu-500/15 text-haysu-600 dark:text-haysu-300 text-xs font-mono font-medium"
            >
              {t}
              <button
                type="button"
                onClick={() =>
                  set(
                    "times",
                    form.times.filter((x) => x !== t)
                  )
                }
                className="w-5 h-5 rounded-md hover:bg-haysu-200/60 dark:hover:bg-haysu-500/30"
                aria-label={`Remove ${t}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            className={`${input} flex-1`}
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTime())}
            placeholder="Add time, e.g. 20:00 or 8 pm"
          />
          <Button size="sm" variant="secondary" onClick={addTime}>
            Add
          </Button>
        </div>
      </div>

      <div>
        <label className={label}>Days</label>
        <div className="flex gap-1">
          {WEEKDAYS.map((d) => {
            const on = form.days.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDay(d.id)}
                aria-pressed={on}
                className={`flex-1 h-7 rounded-lg text-[11px] font-medium ${
                  on
                    ? "bg-haysu-500 text-white"
                    : "bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark"
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Start (optional)</label>
          <input
            type="date"
            className={input}
            value={form.start_date ?? ""}
            onChange={(e) => set("start_date", e.target.value || null)}
          />
        </div>
        <div>
          <label className={label}>End (optional)</label>
          <input
            type="date"
            className={input}
            value={form.end_date ?? ""}
            onChange={(e) => set("end_date", e.target.value || null)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {MEDICINE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set("color", c)}
              aria-label={`Colour ${c}`}
              className={`w-5 h-5 rounded-full border-2 ${
                form.color === c
                  ? "border-text-primary dark:border-text-primary-dark"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <Toggle size="sm" label="Active" checked={form.active} onChange={(v) => set("active", v)} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" fullWidth onClick={save} disabled={saving || !form.name.trim()}>
          {saving ? "Saving…" : medicine ? "Save changes" : "Add medicine"}
        </Button>
      </div>
    </div>
  );
}
