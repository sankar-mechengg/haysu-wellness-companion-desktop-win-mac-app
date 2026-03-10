import { useEffect } from "react";
import StatsCard from "./StatsCard";
import Card from "../common/Card";
import { useStats } from "../../hooks/useStats";
import { formatWaterMl, waterProgress } from "../../lib/waterCalc";

export default function DailyView() {
  const {
    dailyStats,
    waterEntries,
    movementEntries,
    pomodoroEntries,
    loadDailyStats,
    loadTodayEntries,
  } = useStats();

  useEffect(() => {
    loadDailyStats();
    loadTodayEntries();
  }, [loadDailyStats, loadTodayEntries]);

  if (!dailyStats) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-text-secondary dark:text-text-secondary-dark text-sm">Loading today's stats...</p>
      </div>
    );
  }

  const progress = waterProgress(dailyStats.water_total_ml, dailyStats.water_goal_ml);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          title="Water Intake"
          value={formatWaterMl(dailyStats.water_total_ml)}
          subtitle={`${dailyStats.water_consumed} glasses · Goal: ${formatWaterMl(dailyStats.water_goal_ml)}`}
          icon="💧"
          color="#60b8ff"
          progress={progress}
          variant="water"
        />
        <StatsCard
          title="Exercises"
          value={dailyStats.movement_completed}
          subtitle={`${dailyStats.movement_skipped} skipped`}
          icon="🏃"
          color="#7dd3a8"
          variant="move"
        />
        <StatsCard
          title="Focus Sessions"
          value={dailyStats.pomodoro_work_completed}
          subtitle={`${dailyStats.pomodoro_total_minutes} min total`}
          icon="🍅"
          color="#ff7b7b"
          variant="tomato"
        />
        <StatsCard
          title="Completion"
          value={`${progress}%`}
          subtitle="Water goal progress"
          icon="🎯"
          color="#3b93f7"
          progress={progress}
        />
      </div>

      {/* Recent activity */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-3">
          Recent Activity
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {[...waterEntries.slice(0, 5), ...movementEntries.slice(0, 5), ...pomodoroEntries.slice(0, 5)]
            .sort((a, b) => {
              const tA = "timestamp" in a ? a.timestamp : "started_at" in a ? a.started_at : "";
              const tB = "timestamp" in b ? b.timestamp : "started_at" in b ? b.started_at : "";
              return tB.localeCompare(tA);
            })
            .slice(0, 10)
            .map((entry, i) => {
              let icon = "📋";
              let label = "";
              let time = "";
              let status = "";

              if ("amount_ml" in entry) {
                // Water
                icon = "💧";
                label = entry.consumed ? `Drank ${entry.amount_ml}ml` : "Skipped water";
                time = entry.timestamp;
                status = entry.consumed ? "text-water" : "text-text-secondary dark:text-text-secondary-dark";
              } else if ("exercise_name" in entry) {
                // Movement
                icon = "🏃";
                label = entry.completed ? entry.exercise_name : `Skipped: ${entry.exercise_name}`;
                time = entry.timestamp;
                status = entry.completed ? "text-move" : "text-text-secondary dark:text-text-secondary-dark";
              } else if ("session_type" in entry) {
                // Pomodoro
                icon = "🍅";
                label = `${entry.session_type === "work" ? "Work" : "Break"} session`;
                time = entry.started_at;
                status = entry.completed ? "text-tomato" : "text-text-secondary dark:text-text-secondary-dark";
              }

              const timeStr = time
                ? new Date(time).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <div key={`${i}-${time}`} className="flex items-center gap-3 py-1.5">
                  <span className="text-sm">{icon}</span>
                  <span className={`text-xs font-medium flex-1 ${status}`}>{label}</span>
                  <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">{timeStr}</span>
                </div>
              );
            })}

          {waterEntries.length === 0 && movementEntries.length === 0 && pomodoroEntries.length === 0 && (
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center py-4">
              No activity yet today. Your reminders will start soon!
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
