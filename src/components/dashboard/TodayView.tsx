import { useEffect } from "react";
import StatsCard from "./StatsCard";
import StreakCard from "./StreakCard";
import RecentActivity from "./RecentActivity";
import QuickActions from "./QuickActions";
import LiveTimers from "./LiveTimers";
import WeatherCard from "./WeatherCard";
import Card from "../common/Card";
import { useTodayStats } from "../../hooks/useStats";
import { useCountUp } from "../../hooks/useCountUp";
import { useAiStore } from "../../hooks/useAi";
import { celebrateOnce } from "../../lib/confetti";
import { formatMinutes, formatWaterMl, waterProgress } from "../../lib/format";
import { AI_QUICK_ACTIONS } from "../../lib/constants";
import type { AiKind } from "../../lib/api";
import { useLive } from "../../store/appStore";

export default function TodayView({ onAsk }: { onAsk: (kind: AiKind) => void }) {
  const { daily, streaks, water, movement, pomodoro, error } = useTodayStats();
  const live = useLive();
  const aiReady = useAiStore((s) => !!s.status?.active);

  const waterMl = useCountUp(daily?.water_total_ml ?? 0);
  const moves = useCountUp(daily?.movement_completed ?? 0, 500);
  const focus = useCountUp(daily?.pomodoro_work_completed ?? 0, 500);

  // Celebrate the water goal once a day.
  useEffect(() => {
    if (daily && daily.water_goal_ml > 0 && daily.water_total_ml >= daily.water_goal_ml) {
      celebrateOnce("water-goal");
    }
  }, [daily]);

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
  const headline = AI_QUICK_ACTIONS.filter((a) =>
    ["briefing", "meals", "outfit", "posture"].includes(a.kind)
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <LiveTimers />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 stagger">
        <StatsCard
          title="Water"
          value={formatWaterMl(Math.round(waterMl))}
          subtitle={`${daily.water_consumed} logged · goal ${formatWaterMl(daily.water_goal_ml)}`}
          icon="💧"
          color="#60b8ff"
          progress={progress}
          variant="water"
        />
        <StatsCard
          title="Movement"
          value={Math.round(moves)}
          subtitle={daily.movement_skipped ? `${daily.movement_skipped} skipped` : "exercises done"}
          icon="🏃"
          color="#5cc99a"
          variant="move"
        />
        <StatsCard
          title="Focus"
          value={Math.round(focus)}
          subtitle={
            daily.pomodoro_total_minutes ? formatMinutes(daily.pomodoro_total_minutes) : "sessions"
          }
          icon="🍅"
          color="#ff7b7b"
          variant="tomato"
        />
        <StreakCard streaks={streaks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <WeatherCard onOutfit={() => onAsk("outfit")} />
        <Card padding="md" className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark mr-1 flex-shrink-0">
            ✨ Haysu AI
          </span>
          {headline.map((a) => (
            <button
              key={a.kind}
              type="button"
              onClick={() => onAsk(a.kind)}
              title={aiReady ? a.hint : "Add an API key in Settings → Haysu AI"}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-haysu-500/10 text-haysu-600 dark:text-haysu-300 hover:bg-haysu-500/20 whitespace-nowrap transition-colors"
            >
              {a.icon} {a.label}
            </button>
          ))}
          {live?.doses_pending ? (
            <span className="ml-auto text-[11px] text-pill font-medium whitespace-nowrap">
              💊 {live.doses_pending} dose{live.doses_pending === 1 ? "" : "s"} due
            </span>
          ) : null}
        </Card>
      </div>

      <QuickActions />

      <RecentActivity water={water} movement={movement} pomodoro={pomodoro} />
    </div>
  );
}
