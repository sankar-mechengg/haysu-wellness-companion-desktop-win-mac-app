import StatsCard from "./StatsCard";
import StreakCard from "./StreakCard";
import RecentActivity from "./RecentActivity";
import QuickActions from "./QuickActions";
import LiveTimers from "./LiveTimers";
import { useTodayStats } from "../../hooks/useStats";
import { formatMinutes, formatWaterMl, waterProgress } from "../../lib/format";

export default function TodayView() {
  const { daily, streaks, water, movement, pomodoro, error } = useTodayStats();

  if (error) {
    return (
      <p className="text-sm text-tomato py-8 text-center">Could not load today's stats: {error}</p>
    );
  }
  if (!daily) {
    return (
      <p className="text-sm text-text-secondary dark:text-text-secondary-dark py-8 text-center">
        Loading…
      </p>
    );
  }

  const progress = waterProgress(daily.water_total_ml, daily.water_goal_ml);

  return (
    <div className="space-y-4 animate-fade-in">
      <LiveTimers />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatsCard
          title="Water"
          value={formatWaterMl(daily.water_total_ml)}
          subtitle={`${daily.water_consumed} logged · goal ${formatWaterMl(daily.water_goal_ml)}`}
          icon="💧"
          color="#60b8ff"
          progress={progress}
          variant="water"
        />
        <StatsCard
          title="Movement"
          value={daily.movement_completed}
          subtitle={daily.movement_skipped ? `${daily.movement_skipped} skipped` : "exercises done"}
          icon="🏃"
          color="#5cc99a"
          variant="move"
        />
        <StatsCard
          title="Focus"
          value={daily.pomodoro_work_completed}
          subtitle={
            daily.pomodoro_total_minutes ? formatMinutes(daily.pomodoro_total_minutes) : "sessions"
          }
          icon="🍅"
          color="#ff7b7b"
          variant="tomato"
        />
        <StreakCard streaks={streaks} />
      </div>

      <QuickActions />

      <RecentActivity water={water} movement={movement} pomodoro={pomodoro} />
    </div>
  );
}
