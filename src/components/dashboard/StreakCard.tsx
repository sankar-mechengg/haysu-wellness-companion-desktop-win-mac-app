import Card from "../common/Card";
import type { Streaks } from "../../lib/api";

export default function StreakCard({ streaks }: { streaks: Streaks | null }) {
  const current = streaks?.current_streak ?? 0;
  const longest = streaks?.longest_streak ?? 0;
  const active30 = streaks?.active_days_30 ?? 0;
  const todayActive = streaks?.today_active ?? false;

  return (
    <Card padding="md" className="flex items-center gap-3 min-w-0">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
          current > 0 ? "bg-amber/20" : "bg-surface-hover dark:bg-surface-hover-dark"
        }`}
      >
        {current > 0 ? "🔥" : "🌱"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
          Streak
        </p>
        <p className="text-xl font-bold text-text-primary dark:text-text-primary-dark leading-tight tabular-nums">
          {current} {current === 1 ? "day" : "days"}
        </p>
        <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark truncate">
          {todayActive
            ? `best ${longest} · ${active30}/30 active`
            : current > 0
              ? "log something today to keep it"
              : "log anything to start"}
        </p>
      </div>
    </Card>
  );
}
