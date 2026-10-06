import Card from "../common/Card";
import Stepper from "../common/Stepper";
import Toggle from "../common/Toggle";
import { Rows, SectionHeader } from "../common/Section";
import { useConfigPatch } from "../../hooks/useConfigPatch";
import { useConfig } from "../../store/appStore";

export default function PomodoroSettings() {
  const config = useConfig();
  const patch = useConfigPatch();
  if (!config) return null;

  const n = config.pomodoro_sessions_before_long;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Pomodoro"
        description="Changes apply to the next phase. A running phase keeps its length."
        action={
          <button
            type="button"
            onClick={() =>
              patch(
                {
                  pomodoro_work_min: 25,
                  pomodoro_short_break_min: 5,
                  pomodoro_long_break_min: 15,
                  pomodoro_sessions_before_long: 4,
                },
                "Classic 25 / 5 / 15 restored"
              )
            }
            className="text-xs text-haysu-500 hover:text-haysu-600 font-medium"
          >
            Classic 25/5/15
          </button>
        }
      />

      <Card variant="tomato" padding="md">
        <Rows>
          <Stepper
            label="🍅 Work session"
            value={config.pomodoro_work_min}
            min={1}
            max={120}
            step={5}
            unit="min"
            onChange={(v) => patch({ pomodoro_work_min: v })}
          />
          <Stepper
            label="☕ Short break"
            value={config.pomodoro_short_break_min}
            min={1}
            max={30}
            unit="min"
            onChange={(v) => patch({ pomodoro_short_break_min: v })}
          />
          <Stepper
            label="🌴 Long break"
            value={config.pomodoro_long_break_min}
            min={5}
            max={60}
            step={5}
            unit="min"
            onChange={(v) => patch({ pomodoro_long_break_min: v })}
          />
          <Stepper
            label="🔄 Long break after"
            value={n}
            min={2}
            max={8}
            unit="sess."
            onChange={(v) => patch({ pomodoro_sessions_before_long: v })}
          />
        </Rows>
      </Card>

      <Card padding="md">
        <Rows>
          <Toggle
            label="Start breaks automatically"
            description="When a work session ends, the break begins right away"
            checked={config.pomodoro_auto_start_break}
            onChange={(v) => patch({ pomodoro_auto_start_break: v })}
          />
          <Toggle
            label="Start work automatically"
            description="When a break ends, the next focus session begins right away"
            checked={config.pomodoro_auto_start_work}
            onChange={(v) => patch({ pomodoro_auto_start_work: v })}
          />
        </Rows>
      </Card>

      <Card padding="md">
        <h4 className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
          One cycle
        </h4>
        <div className="flex items-center gap-1 flex-wrap">
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="px-2 py-1 rounded-lg bg-tomato/10 text-[10px] font-medium text-tomato">
                🍅 {config.pomodoro_work_min}m
              </span>
              <span className="px-2 py-1 rounded-lg bg-move/10 text-[10px] font-medium text-move">
                {i === n - 1
                  ? `🌴 ${config.pomodoro_long_break_min}m`
                  : `☕ ${config.pomodoro_short_break_min}m`}
              </span>
              {i < n - 1 && <span className="text-text-secondary/40 mx-0.5">→</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
