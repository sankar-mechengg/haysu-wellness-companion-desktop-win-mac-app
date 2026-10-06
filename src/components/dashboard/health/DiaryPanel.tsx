import { useMemo, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import Card from "../../common/Card";
import Button from "../../common/Button";
import Slider from "../../common/Slider";
import { toast } from "../../common/Toast";
import ConditionsCard from "./ConditionsCard";
import { useConditions, useDiary, useSymptomSuggestions } from "../../../hooks/useHealth";
import { api, errorMessage, type DiaryEntry, type DiaryInput } from "../../../lib/api";
import { addDays, formatTimeOfDay, localDateString, relativeDay } from "../../../lib/format";
import {
  ENERGY_EMOJI,
  ENERGY_LABELS,
  groupByDate,
  MOOD_EMOJI,
  MOOD_LABELS,
} from "../../../lib/health";

const RANGE = 60;

const empty: DiaryInput = {
  mood: null,
  energy: null,
  sleep_hours: null,
  pain: null,
  symptoms: [],
  notes: "",
  condition_id: null,
};

export default function DiaryPanel() {
  const today = localDateString();
  const from = localDateString(addDays(new Date(), -(RANGE - 1)));
  const { data: entries } = useDiary(from, today);
  const { data: conditions } = useConditions();
  const { data: suggestions } = useSymptomSuggestions();
  const [form, setForm] = useState<DiaryInput>(empty);
  const [symptomText, setSymptomText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const grouped = useMemo(() => groupByDate(entries), [entries]);
  const set = <K extends keyof DiaryInput>(k: K, v: DiaryInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addSymptom = (raw: string) => {
    const s = raw.trim().toLowerCase();
    if (!s) return;
    if (!form.symptoms.includes(s)) set("symptoms", [...form.symptoms, s]);
    setSymptomText("");
  };

  const reset = () => {
    setForm(empty);
    setEditingId(null);
    setSymptomText("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const pending = symptomText.trim();
      const payload: DiaryInput = {
        ...form,
        id: editingId ?? undefined,
        symptoms:
          pending && !form.symptoms.includes(pending.toLowerCase())
            ? [...form.symptoms, pending.toLowerCase()]
            : form.symptoms,
      };
      await api.saveDiaryEntry(payload);
      toast.success(editingId ? "Entry updated" : "Entry saved");
      reset();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const edit = (e: DiaryEntry) => {
    setEditingId(e.id);
    setForm({
      timestamp: e.timestamp,
      mood: e.mood,
      energy: e.energy,
      sleep_hours: e.sleep_hours,
      pain: e.pain,
      symptoms: [...e.symptoms],
      notes: e.notes,
      condition_id: e.condition_id,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (e: DiaryEntry) => {
    const ok = await ask("Delete this diary entry?", {
      title: "Delete entry",
      kind: "warning",
      okLabel: "Delete",
    });
    if (!ok) return;
    try {
      await api.deleteDiaryEntry(e.id);
      if (editingId === e.id) reset();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const scale = (
    value: number | null,
    onPick: (v: number | null) => void,
    emoji: readonly string[],
    labels: readonly string[]
  ) => (
    <div className="flex gap-1">
      {emoji.map((em, i) => {
        const v = i + 1;
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onPick(on ? null : v)}
            title={labels[i]}
            aria-pressed={on}
            className={`flex-1 h-9 rounded-lg text-lg transition-all ${
              on
                ? "bg-haysu-500/15 ring-2 ring-haysu-500 scale-105"
                : "bg-surface-hover dark:bg-surface-hover-dark hover:scale-105"
            }`}
          >
            {em}
          </button>
        );
      })}
    </div>
  );

  const lbl =
    "block text-[11px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1";
  const canSave =
    form.mood != null ||
    form.energy != null ||
    form.pain != null ||
    form.sleep_hours != null ||
    form.symptoms.length > 0 ||
    form.notes.trim() !== "" ||
    symptomText.trim() !== "";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-3 space-y-4">
        {/* Entry form */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              {editingId ? "Edit entry" : "How are you doing right now?"}
            </h3>
            {editingId && (
              <button type="button" onClick={reset} className="text-xs text-haysu-500 font-medium">
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>
                Mood {form.mood ? `· ${MOOD_LABELS[form.mood - 1]}` : ""}
              </label>
              {scale(form.mood, (v) => set("mood", v), MOOD_EMOJI, MOOD_LABELS)}
            </div>
            <div>
              <label className={lbl}>
                Energy {form.energy ? `· ${ENERGY_LABELS[form.energy - 1]}` : ""}
              </label>
              {scale(form.energy, (v) => set("energy", v), ENERGY_EMOJI, ENERGY_LABELS)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider
              label="Pain"
              value={form.pain ?? 0}
              onChange={(v) => set("pain", v)}
              min={0}
              max={10}
              format={(v) => (v === 0 ? "none" : `${v}/10`)}
            />
            <div>
              <label className={lbl}>Sleep last night</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={form.sleep_hours ?? ""}
                  onChange={(e) =>
                    set("sleep_hours", e.target.value === "" ? null : Number(e.target.value))
                  }
                  placeholder="7.5"
                  className="w-24 px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300"
                />
                <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  hours
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Symptoms</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {form.symptoms.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 pl-2 pr-1 h-7 rounded-lg bg-tomato/10 text-tomato text-xs font-medium"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "symptoms",
                        form.symptoms.filter((x) => x !== s)
                      )
                    }
                    className="w-5 h-5 rounded-md hover:bg-tomato/20"
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addSymptom(symptomText);
                }
              }}
              placeholder="headache, nausea… press Enter to add"
              className="w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300"
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {suggestions
                  .filter((s) => !form.symptoms.includes(s))
                  .slice(0, 8)
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSymptom(s)}
                      className="px-2 h-6 rounded-md text-[11px] bg-surface-hover dark:bg-surface-hover-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark"
                    >
                      + {s}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Anything worth remembering: triggers, what helped, questions for the doctor…"
                className="w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300 resize-none"
              />
            </div>
            <div>
              <label className={lbl}>Related condition</label>
              <select
                value={form.condition_id ?? ""}
                onChange={(e) =>
                  set("condition_id", e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300"
              >
                <option value="">None</option>
                {conditions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.status === "resolved" ? " (resolved)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button fullWidth size="md" onClick={save} disabled={saving || !canSave}>
            {saving ? "Saving…" : editingId ? "Save changes" : "Save entry"}
          </Button>
        </Card>

        {/* Timeline */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">
            Last {RANGE} days
          </h3>
          {grouped.length === 0 ? (
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center py-6">
              No entries yet. A few seconds a day builds a picture your doctor can actually use.
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.date}>
                  <p className="text-[11px] uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark mb-1.5">
                    {relativeDay(g.date)}
                  </p>
                  <ul className="space-y-2">
                    {g.items.map((e) => (
                      <li
                        key={e.id}
                        className={`group rounded-xl border p-3 ${
                          editingId === e.id
                            ? "border-haysu-500"
                            : "border-border/60 dark:border-border-dark/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-xl leading-none mt-0.5 w-7 text-center">
                            {e.mood ? MOOD_EMOJI[e.mood - 1] : "📝"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-secondary dark:text-text-secondary-dark">
                              <span className="tabular-nums">{formatTimeOfDay(e.timestamp)}</span>
                              {e.mood && <span>mood {MOOD_LABELS[e.mood - 1].toLowerCase()}</span>}
                              {e.energy && (
                                <span>· energy {ENERGY_LABELS[e.energy - 1].toLowerCase()}</span>
                              )}
                              {e.pain != null && e.pain > 0 && (
                                <span className="text-tomato">· pain {e.pain}/10</span>
                              )}
                              {e.sleep_hours != null && <span>· slept {e.sleep_hours}h</span>}
                              {e.condition_id && (
                                <span className="text-pill">
                                  ·{" "}
                                  {conditions.find((c) => c.id === e.condition_id)?.name ??
                                    "condition"}
                                </span>
                              )}
                            </div>
                            {e.symptoms.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {e.symptoms.map((s) => (
                                  <span
                                    key={s}
                                    className="px-1.5 h-5 inline-flex items-center rounded-md bg-tomato/10 text-tomato text-[11px]"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                            {e.notes && (
                              <p className="text-xs text-text-primary dark:text-text-primary-dark mt-1 whitespace-pre-wrap">
                                {e.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => edit(e)}
                              className="text-[11px] text-haysu-500 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(e)}
                              className="text-[11px] text-text-secondary hover:text-tomato font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="xl:col-span-2">
        <ConditionsCard conditions={conditions} />
      </div>
    </div>
  );
}
