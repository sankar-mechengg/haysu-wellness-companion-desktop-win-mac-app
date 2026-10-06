import { useState } from "react";
import WaterChart from "./WaterChart";
import MovementChart from "./MovementChart";
import PomodoroChart from "./PomodoroChart";
import StatsCard from "./StatsCard";
import { useWeeklyStats } from "../../hooks/useStats";
import { addDays, formatMinutes, formatShortDate, formatWaterMl } from "../../lib/format";
import { useProfile } from "../../store/appStore";

export default function WeekView() {
  const [offset, setOffset] = useState(0);
  const { days, loading, start } = useWeeklyStats(offset);
  const profile = useProfile();
  const goal = profile?.daily_water_ml ?? 2450;

  const totals = days.reduce(
    (acc, d) => ({
      waterMl: acc.waterMl + d.water_total_ml,
      goalDays: acc.goalDays + (d.water_total_ml >= d.water_goal_ml && d.water_goal_ml > 0 ? 1 : 0),
      movement: acc.movement + d.movement_completed,
      movementSkipped: acc.movementSkipped + d.movement_skipped,
      sessions: acc.sessions + d.pomodoro_work_completed,
      focusMin: acc.focusMin + d.pomodoro_total_minutes,
    }),
    { waterMl: 0, goalDays: 0, movement: 0, movementSkipped: 0, sessions: 0, focusMin: 0 }
  );

  const label =
    offset === 0
      ? "This week"
      : offset === -1
        ? "Last week"
        : `${formatShortDate(start)} – ${formatShortDate(addDays(start, 6))}`;

  const navBtn =
    "h-8 px-3 rounded-lg text-xs font-medium text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark disabled:opacity-30 transition-colors";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button type="button" className={navBtn} onClick={() => setOffset((o) => o - 1)}>
          ← Previous
        </button>
        <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          {label}
          <span className="text-text-secondary dark:text-text-secondary-dark font-normal ml-2 text-xs">
            {formatShortDate(start)} – {formatShortDate(addDays(start, 6))}
          </span>
        </span>
        <button
          type="button"
          className={navBtn}
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatsCard
          title="Water"
          value={formatWaterMl(totals.waterMl)}
          subtitle={`goal met ${totals.goalDays}/7 days`}
          icon="💧"
          color="#60b8ff"
        />
        <StatsCard
          title="Movement"
          value={totals.movement}
          subtitle={totals.movementSkipped ? `${totals.movementSkipped} skipped` : "exercises"}
          icon="🏃"
          color="#5cc99a"
        />
        <StatsCard
          title="Focus"
          value={formatMinutes(totals.focusMin)}
          subtitle={`${totals.sessions} sessions`}
          icon="🍅"
          color="#ff7b7b"
        />
      </div>

      {loading && days.length === 0 ? (
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark text-center py-8">
          Loading…
        </p>
      ) : (
        <>
          <WaterChart data={days} goalMl={goal} />
          <MovementChart data={days} />
          <PomodoroChart data={days} />
        </>
      )}
    </div>
  );
}
