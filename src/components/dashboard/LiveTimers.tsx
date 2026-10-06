import { api } from "../../lib/api";
import { formatClock, formatDurationShort } from "../../lib/format";
import { slotTime } from "../../lib/health";
import { useLive } from "../../store/appStore";

/** Thin strip showing the live countdowns and status. */
export default function LiveTimers() {
  const live = useLive();
  if (!live) return null;

  const pill = "flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-medium";
  const paused = live.dnd.enabled
    ? "Do Not Disturb"
    : live.paused_reason === "schedule"
      ? "Outside work hours"
      : live.paused_reason === "idle"
        ? "Paused while away"
        : null;

  const dose = live.next_dose;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {paused ? (
        <span
          className={`${pill} bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark`}
        >
          🔕 {paused}
        </span>
      ) : (
        <>
          <span className={`${pill} bg-water/15 text-water`}>
            💧 Water in {formatDurationShort(live.water.remaining_secs)}
          </span>
          <span className={`${pill} bg-move/15 text-move`}>
            🏃 Move in {formatDurationShort(live.movement.remaining_secs)}
          </span>
        </>
      )}
      <span className={`${pill} bg-tomato/15 text-tomato`}>
        🍅{" "}
        {live.pomodoro.running
          ? `${live.pomodoro.phase === "work" ? "Focus" : "Break"} ${formatClock(live.pomodoro.remaining_secs)}${live.pomodoro.paused ? " (paused)" : ""}`
          : "Pomodoro idle"}
      </span>
      {dose && (
        <button
          type="button"
          onClick={() => dose.overdue && api.logDose(dose.medicine_id, dose.scheduled_at, "taken")}
          title={dose.overdue ? "Mark as taken" : "Next dose"}
          className={`${pill} ${
            dose.overdue
              ? "bg-pill/20 text-pill animate-pulse-soft hover:bg-pill/30"
              : "bg-pill/10 text-pill cursor-default"
          }`}
        >
          💊 {dose.name} {dose.overdue ? "due" : `at ${slotTime(dose.scheduled_at)}`}
        </button>
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => api.toggleDnd()}
        className={`${pill} border transition-colors ${
          live.dnd.enabled
            ? "bg-haysu-500 border-haysu-500 text-white"
            : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark"
        }`}
      >
        {live.dnd.enabled ? "DND on" : "DND"}
      </button>
    </div>
  );
}
