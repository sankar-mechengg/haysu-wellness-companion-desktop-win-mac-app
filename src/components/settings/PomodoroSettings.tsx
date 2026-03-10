import Card from "../common/Card";
import { HOTKEYS } from "../../lib/constants";

export default function PomodoroSettings() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Pomodoro Timer</h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
          Classic Pomodoro technique cycle
        </p>
      </div>

      <Card variant="tomato" padding="md">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🍅</span>
              <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Work Session</span>
            </div>
            <span className="text-sm font-bold text-tomato">25 min</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">☕</span>
              <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Short Break</span>
            </div>
            <span className="text-sm font-bold text-move">5 min</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌴</span>
              <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Long Break</span>
            </div>
            <span className="text-sm font-bold text-haysu-500">15 min</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-tomato/10 dark:border-tomato/20">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔄</span>
              <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Long break after</span>
            </div>
            <span className="text-sm font-bold text-text-primary dark:text-text-primary-dark">4 sessions</span>
          </div>
        </div>
      </Card>

      {/* Cycle visualization */}
      <Card padding="md">
        <h4 className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-3">Cycle</h4>
        <div className="flex items-center gap-1 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="px-2 py-1 rounded-lg bg-tomato/10 text-[10px] font-medium text-tomato">
                🍅 25m
              </div>
              <div className="px-2 py-1 rounded-lg bg-move/10 text-[10px] font-medium text-move">
                {i === 4 ? "🌴 15m" : "☕ 5m"}
              </div>
              {i < 4 && <span className="text-text-secondary/30 mx-0.5">→</span>}
            </div>
          ))}
        </div>
      </Card>

      {/* Hotkey info */}
      <Card padding="md" variant="transparent">
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center">
          Toggle Pomodoro:{" "}
          <span className="font-mono bg-surface dark:bg-surface-dark px-1.5 py-0.5 rounded border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark">
            {HOTKEYS.togglePomodoro.label}
          </span>
        </p>
      </Card>
    </div>
  );
}
