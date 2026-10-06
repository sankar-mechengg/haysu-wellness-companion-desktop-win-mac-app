import { useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import Card from "../../common/Card";
import Button from "../../common/Button";
import { toast } from "../../common/Toast";
import { api, errorMessage, type Condition, type ConditionInput } from "../../../lib/api";
import { formatShortDate, localDateString, parseLocalDate } from "../../../lib/format";
import { SEVERITY_LABELS } from "../../../lib/health";

const input =
  "w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300";
const lbl = "block text-[11px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1";

const blank: ConditionInput = {
  name: "",
  notes: "",
  severity: 2,
  status: "active",
  started_on: localDateString(),
  resolved_on: null,
};

export default function ConditionsCard({ conditions }: { conditions: Condition[] }) {
  const [form, setForm] = useState<ConditionInput | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ConditionInput>(k: K, v: ConditionInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await api.saveCondition(form);
      toast.success(form.id ? "Condition updated" : "Condition added");
      setForm(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleResolved = async (c: Condition) => {
    try {
      await api.saveCondition({
        id: c.id,
        name: c.name,
        notes: c.notes,
        severity: c.severity,
        status: c.status === "active" ? "resolved" : "active",
        started_on: c.started_on,
        resolved_on: c.status === "active" ? localDateString() : null,
      });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async (c: Condition) => {
    const ok = await ask(`Delete ${c.name}? Diary entries stay but lose the link.`, {
      title: "Delete condition",
      kind: "warning",
      okLabel: "Delete",
    });
    if (!ok) return;
    try {
      await api.deleteCondition(c.id);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const active = conditions.filter((c) => c.status === "active");
  const resolved = conditions.filter((c) => c.status === "resolved");

  const row = (c: Condition) => (
    <li key={c.id} className="group flex items-start gap-2.5 py-2">
      <span
        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
          c.status === "resolved"
            ? "bg-move"
            : c.severity >= 4
              ? "bg-tomato"
              : c.severity === 3
                ? "bg-amber"
                : "bg-haysu-400"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            c.status === "resolved"
              ? "text-text-secondary dark:text-text-secondary-dark line-through decoration-border"
              : "text-text-primary dark:text-text-primary-dark"
          }`}
        >
          {c.name}
        </p>
        <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
          {SEVERITY_LABELS[c.severity - 1]}
          {c.started_on && ` · since ${formatShortDate(parseLocalDate(c.started_on))}`}
          {c.resolved_on && ` · resolved ${formatShortDate(parseLocalDate(c.resolved_on))}`}
        </p>
        {c.notes && (
          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark mt-0.5 whitespace-pre-wrap">
            {c.notes}
          </p>
        )}
      </div>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => toggleResolved(c)}
          className="text-[11px] text-move font-medium"
          title={c.status === "active" ? "Mark resolved" : "Reopen"}
        >
          {c.status === "active" ? "Resolve" : "Reopen"}
        </button>
        <button
          type="button"
          onClick={() =>
            setForm({
              id: c.id,
              name: c.name,
              notes: c.notes,
              severity: c.severity,
              status: c.status,
              started_on: c.started_on,
              resolved_on: c.resolved_on,
            })
          }
          className="text-[11px] text-haysu-500 font-medium"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => remove(c)}
          className="text-[11px] text-text-secondary hover:text-tomato font-medium"
        >
          Delete
        </button>
      </div>
    </li>
  );

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          Health conditions
        </h3>
        {!form && (
          <Button size="sm" variant="secondary" onClick={() => setForm({ ...blank })}>
            + Add
          </Button>
        )}
      </div>

      {form && (
        <div className="rounded-xl border border-haysu-300/60 dark:border-haysu-500/40 p-3 space-y-2.5 mb-3 animate-pop">
          <div>
            <label className={lbl}>Condition</label>
            <input
              className={input}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Migraine, Lower back pain, Hypertension"
              maxLength={80}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Severity · {SEVERITY_LABELS[form.severity - 1]}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("severity", s)}
                    aria-pressed={form.severity === s}
                    className={`flex-1 h-7 rounded-lg text-xs font-semibold ${
                      form.severity === s
                        ? "bg-haysu-500 text-white"
                        : "bg-surface-hover dark:bg-surface-hover-dark text-text-secondary dark:text-text-secondary-dark"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>Since</label>
              <input
                type="date"
                className={input}
                value={form.started_on ?? ""}
                onChange={(e) => set("started_on", e.target.value || null)}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea
              className={`${input} resize-none`}
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Diagnosis, doctor, what helps…"
              maxLength={2000}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" fullWidth onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : form.id ? "Save" : "Add condition"}
            </Button>
          </div>
        </div>
      )}

      {conditions.length === 0 && !form ? (
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark py-5 text-center">
          Track ongoing issues so diary entries and trends can be tied to them.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border/50 dark:divide-border-dark/50">
            {active.map(row)}
          </ul>
          {resolved.length > 0 && (
            <>
              <p className="text-[11px] uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark mt-3 mb-1">
                Resolved
              </p>
              <ul className="divide-y divide-border/50 dark:divide-border-dark/50">
                {resolved.map(row)}
              </ul>
            </>
          )}
        </>
      )}
    </Card>
  );
}
