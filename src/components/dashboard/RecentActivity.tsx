import Card from "../common/Card";
import {
  api,
  type MovementEntry,
  type PomodoroEntry,
  type ReminderKind,
  type WaterEntry,
} from "../../lib/api";
import { formatTimeOfDay } from "../../lib/format";
import { toast } from "../common/Toast";

interface Row {
  key: string;
  kind: ReminderKind;
  id: number;
  icon: string;
  label: string;
  time: string;
  ok: boolean;
}

export default function RecentActivity({
  water,
  movement,
  pomodoro,
}: {
  water: WaterEntry[];
  movement: MovementEntry[];
  pomodoro: PomodoroEntry[];
}) {
  const rows: Row[] = [
    ...water.map<Row>((e) => ({
      key: `w${e.id}`,
      kind: "water",
      id: e.id,
      icon: "💧",
      label: e.consumed ? `Drank ${e.amount_ml} ml` : "Skipped water",
      time: e.timestamp,
      ok: e.consumed,
    })),
    ...movement.map<Row>((e) => ({
      key: `m${e.id}`,
      kind: "movement",
      id: e.id,
      icon: "🏃",
      label: e.completed ? e.exercise_name : `Skipped ${e.exercise_name}`,
      time: e.timestamp,
      ok: e.completed,
    })),
    ...pomodoro.map<Row>((e) => ({
      key: `p${e.id}`,
      kind: "pomodoro",
      id: e.id,
      icon: "🍅",
      label:
        e.session_type === "work"
          ? e.completed
            ? "Focus session"
            : e.ended_at
              ? "Focus session (stopped)"
              : "Focus session (in progress)"
          : e.session_type === "long_break"
            ? "Long break"
            : "Short break",
      time: e.started_at,
      ok: e.completed,
    })),
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 12);

  const remove = async (r: Row) => {
    try {
      await api.deleteEntry(r.kind, r.id);
      toast.info("Entry removed");
    } catch (e) {
      toast.error(`Could not remove: ${String(e)}`);
    }
  };

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">
        Recent activity
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center py-5">
          Nothing logged yet today. Your next reminder is on its way.
        </p>
      ) : (
        <ul className="divide-y divide-border/50 dark:divide-border-dark/50">
          {rows.map((r) => (
            <li key={r.key} className="group flex items-center gap-3 py-1.5">
              <span className="text-sm w-5 text-center">{r.icon}</span>
              <span
                className={`flex-1 text-xs font-medium ${
                  r.ok
                    ? "text-text-primary dark:text-text-primary-dark"
                    : "text-text-secondary dark:text-text-secondary-dark line-through decoration-border"
                }`}
              >
                {r.label}
              </span>
              <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark tabular-nums">
                {formatTimeOfDay(r.time)}
              </span>
              <button
                type="button"
                onClick={() => remove(r)}
                title="Remove entry"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 rounded-md text-xs text-text-secondary hover:text-tomato hover:bg-tomato/10 transition-all"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
