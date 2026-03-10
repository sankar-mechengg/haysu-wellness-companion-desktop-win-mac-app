import { useEffect, useState, useCallback } from "react";
import WaterChart from "./WaterChart";
import MovementChart from "./MovementChart";
import PomodoroChart from "./PomodoroChart";
import StatsCard from "./StatsCard";
import { useStats } from "../../hooks/useStats";
import { formatWaterMl } from "../../lib/waterCalc";
import { useAppStore } from "../../store/appStore";

export default function WeeklyView() {
  const { weeklyStats, loadWeeklyStats, weekStartStr } = useStats();
  const dailyWaterMl = useAppStore((s) => s.dailyWaterMl);
  const [weekOffset, setWeekOffset] = useState(0);

  const loadWeek = useCallback((offset: number) => {
    const d = new Date();
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7);
    const startStr = monday.toISOString().split("T")[0];
    loadWeeklyStats(startStr);
  }, [loadWeeklyStats]);

  useEffect(() => {
    loadWeek(weekOffset);
  }, [weekOffset, loadWeek]);

  // Aggregate weekly totals
  const totals = weeklyStats.reduce(
    (acc, d) => ({
      waterMl: acc.waterMl + d.water_total_ml,
      waterGoalMl: acc.waterGoalMl + d.water_goal_ml,
      movement: acc.movement + d.movement_completed,
      movementSkipped: acc.movementSkipped + d.movement_skipped,
      pomodoro: acc.pomodoro + d.pomodoro_work_completed,
      focusMin: acc.focusMin + d.pomodoro_total_minutes,
    }),
    { waterMl: 0, waterGoalMl: 0, movement: 0, movementSkipped: 0, pomodoro: 0, focusMin: 0 }
  );

  // Week label
  const getWeekLabel = () => {
    if (weekOffset === 0) return "This Week";
    if (weekOffset === -1) return "Last Week";
    const d = new Date();
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.toLocaleDateString("en", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en", { month: "short", day: "numeric" })}`;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="px-3 py-1.5 text-xs font-medium text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark rounded-lg hover:bg-surface-hover dark:hover:bg-surface-hover-dark transition-colors"
        >
          ← Previous
        </button>
        <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          {getWeekLabel()}
        </span>
        <button
          onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
          disabled={weekOffset >= 0}
          className="px-3 py-1.5 text-xs font-medium text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark rounded-lg hover:bg-surface-hover dark:hover:bg-surface-hover-dark transition-colors disabled:opacity-30"
        >
          Next →
        </button>
      </div>

      {/* Weekly summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatsCard
          title="Total Water"
          value={formatWaterMl(totals.waterMl)}
          icon="💧"
          color="#60b8ff"
        />
        <StatsCard
          title="Exercises"
          value={totals.movement}
          subtitle={`${totals.movementSkipped} skipped`}
          icon="🏃"
          color="#7dd3a8"
        />
        <StatsCard
          title="Focus Time"
          value={`${totals.focusMin}m`}
          subtitle={`${totals.pomodoro} sessions`}
          icon="🍅"
          color="#ff7b7b"
        />
      </div>

      {/* Charts */}
      {weeklyStats.length > 0 ? (
        <>
          <WaterChart data={weeklyStats} goalMl={dailyWaterMl} />
          <MovementChart data={weeklyStats} />
          <PomodoroChart data={weeklyStats} />
        </>
      ) : (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
            No data for this week yet
          </p>
        </div>
      )}
    </div>
  );
}
