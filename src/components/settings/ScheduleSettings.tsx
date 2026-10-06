import Card from "../common/Card";
import Toggle from "../common/Toggle";
import Slider from "../common/Slider";
import { Rows, SectionHeader } from "../common/Section";
import { useConfigPatch } from "../../hooks/useConfigPatch";
import { WEEKDAYS } from "../../lib/constants";
import { formatMinutes } from "../../lib/format";
import { useConfig, useLive } from "../../store/appStore";

const timeInput =
  "px-2 py-1 rounded-lg text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300 [color-scheme:light] dark:[color-scheme:dark]";

export default function ScheduleSettings() {
  const config = useConfig();
  const live = useLive();
  const patch = useConfigPatch();
  if (!config) return null;

  const toggleDay = (d: number) => {
    const days = config.schedule_days.includes(d)
      ? config.schedule_days.filter((x) => x !== d)
      : [...config.schedule_days, d].sort();
    patch({ schedule_days: days });
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Schedule & presence"
        description="Only remind you when you are actually at your desk."
      />

      <Card padding="md">
        <Rows>
          <Toggle
            label="Work hours only"
            description="Water and movement reminders pause outside these hours"
            checked={config.schedule_enabled}
            onChange={(v) => patch({ schedule_enabled: v })}
          />
          <div
            className={`space-y-3 ${config.schedule_enabled ? "" : "opacity-50 pointer-events-none"}`}
          >
            <div className="flex items-center gap-3">
              <label className="text-sm text-text-primary dark:text-text-primary-dark w-12">
                From
              </label>
              <input
                type="time"
                value={config.schedule_start}
                onChange={(e) => e.target.value && patch({ schedule_start: e.target.value })}
                className={timeInput}
              />
              <label className="text-sm text-text-primary dark:text-text-primary-dark w-8 text-right">
                to
              </label>
              <input
                type="time"
                value={config.schedule_end}
                onChange={(e) => e.target.value && patch({ schedule_end: e.target.value })}
                className={timeInput}
              />
              {config.schedule_start > config.schedule_end && (
                <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
                  (overnight)
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = config.schedule_days.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    aria-pressed={on}
                    className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${
                      on
                        ? "bg-haysu-500 text-white"
                        : "bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark hover:border-haysu-300"
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>
        </Rows>
      </Card>

      <Card padding="md">
        <Rows>
          <Toggle
            label="Pause when I'm away"
            description="No keyboard or mouse activity pauses the countdowns until you're back"
            checked={config.idle_pause_enabled}
            onChange={(v) => patch({ idle_pause_enabled: v })}
          />
          <div className={config.idle_pause_enabled ? "" : "opacity-50 pointer-events-none"}>
            <Slider
              label="Consider me away after"
              value={config.idle_threshold_min}
              onChangeEnd={(v) => patch({ idle_threshold_min: v })}
              min={1}
              max={30}
              format={formatMinutes}
            />
            {live && (
              <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark mt-1">
                Current idle time: {Math.floor(live.idle_secs / 60)}m {live.idle_secs % 60}s
                {live.paused_reason === "idle" && " · reminders paused"}
              </p>
            )}
          </div>
        </Rows>
      </Card>

      <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
        The Pomodoro timer is never paused by the schedule or idle detection. You started it on
        purpose.
      </p>
    </div>
  );
}
