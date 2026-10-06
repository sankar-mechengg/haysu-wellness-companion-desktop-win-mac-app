import { api } from "../../lib/api";
import { WATER_QUICK_AMOUNTS } from "../../lib/constants";
import { useConfig, useLive } from "../../store/appStore";
import { toast } from "../common/Toast";
import Card from "../common/Card";

export default function QuickActions() {
  const config = useConfig();
  const live = useLive();
  const amounts = [...new Set([config?.water_amount_ml ?? 250, ...WATER_QUICK_AMOUNTS])].sort(
    (a, b) => a - b
  );

  const logWater = async (ml: number) => {
    try {
      await api.logWater(true, ml);
      toast.success(`Logged ${ml} ml`);
    } catch (e) {
      toast.error(`Could not log water: ${String(e)}`);
    }
  };

  const pomo = live?.pomodoro;

  return (
    <Card padding="md">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark mr-1">
          Quick log
        </span>
        {amounts.map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => logWater(ml)}
            className="h-8 px-3 rounded-lg text-xs font-semibold bg-water/15 text-water hover:bg-water/25 transition-colors"
          >
            💧 +{ml} ml
          </button>
        ))}
        <div className="flex-1" />
        {pomo?.running ? (
          <>
            <button
              type="button"
              onClick={() => api.pomodoro("toggle")}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-tomato/15 text-tomato hover:bg-tomato/25"
            >
              {pomo.paused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button
              type="button"
              onClick={() => api.pomodoro("skip")}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-tomato/15 text-tomato hover:bg-tomato/25"
            >
              ⏭ Skip
            </button>
            <button
              type="button"
              onClick={() => api.pomodoro("stop")}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-surface-hover dark:bg-surface-hover-dark text-text-secondary dark:text-text-secondary-dark hover:text-tomato"
            >
              ■ Stop
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => api.pomodoro("start")}
            className="h-8 px-3 rounded-lg text-xs font-semibold bg-tomato text-white hover:opacity-90"
          >
            🍅 Start {pomo?.queued && pomo.queued !== "work" ? "break" : "focus"}
          </button>
        )}
      </div>
    </Card>
  );
}
