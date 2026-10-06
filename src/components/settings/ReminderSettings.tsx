import Card from "../common/Card";
import Slider from "../common/Slider";
import Toggle from "../common/Toggle";
import Segmented from "../common/Segmented";
import { Rows, SectionHeader } from "../common/Section";
import { useConfigPatch } from "../../hooks/useConfigPatch";
import { ADAPTIVE_INTERVALS } from "../../lib/constants";
import { formatMinutes } from "../../lib/format";
import { useConfig, useProfile } from "../../store/appStore";
import type { ReminderStyle } from "../../lib/api";

export default function ReminderSettings() {
  const config = useConfig();
  const profile = useProfile();
  const patch = useConfigPatch();
  if (!config) return null;

  const perDay = (min: number) => Math.floor((8 * 60) / min);
  const adaptive = ADAPTIVE_INTERVALS[profile?.work_style ?? "moderate"];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Reminders"
        description="How often Haysu nudges you, and how the nudge looks."
        action={
          <button
            type="button"
            onClick={() =>
              patch(
                { water_interval_min: adaptive.water, movement_interval_min: adaptive.movement },
                "Intervals reset for your work style"
              )
            }
            className="text-xs text-haysu-500 hover:text-haysu-600 font-medium"
          >
            Reset to adaptive
          </button>
        }
      />

      <Card variant="water" padding="md" className="space-y-3">
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          💧 Water
        </h4>
        <Slider
          label="Interval"
          value={config.water_interval_min}
          onChangeEnd={(v) => patch({ water_interval_min: v })}
          min={10}
          max={120}
          step={5}
          format={formatMinutes}
        />
        <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark -mt-1">
          ≈ {perDay(config.water_interval_min)} reminders in an 8-hour day
        </p>
        <Slider
          label="Default amount per reminder"
          value={config.water_amount_ml}
          onChangeEnd={(v) => patch({ water_amount_ml: v })}
          min={100}
          max={750}
          step={50}
          unit=" ml"
        />
      </Card>

      <Card variant="move" padding="md" className="space-y-3">
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          🏃 Movement
        </h4>
        <Slider
          label="Interval"
          value={config.movement_interval_min}
          onChangeEnd={(v) => patch({ movement_interval_min: v })}
          min={15}
          max={180}
          step={5}
          format={formatMinutes}
        />
        <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark -mt-1">
          ≈ {perDay(config.movement_interval_min)} breaks in an 8-hour day · exercises match your{" "}
          <span className="font-medium">{profile?.work_style ?? "moderate"}</span> profile
        </p>
      </Card>

      <Card padding="md" className="space-y-1">
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">
          💊 Medicine reminders
        </h4>
        <Rows>
          <Toggle
            label="Remind me about medicines"
            description="Manage your medicines and times on the dashboard's Health tab"
            checked={config.medicine_reminders_enabled}
            onChange={(v) => patch({ medicine_reminders_enabled: v })}
          />
          <Toggle
            label="Always deliver, even in Do Not Disturb"
            description="Doses also fire outside work hours and while you're away"
            checked={config.medicine_override_dnd}
            onChange={(v) => patch({ medicine_override_dnd: v })}
            disabled={!config.medicine_reminders_enabled}
          />
          <Slider
            label="Count a dose as missed after"
            value={config.medicine_missed_after_min}
            onChangeEnd={(v) => patch({ medicine_missed_after_min: v })}
            min={15}
            max={360}
            step={15}
            format={formatMinutes}
            disabled={!config.medicine_reminders_enabled}
          />
        </Rows>
      </Card>

      <Card padding="md">
        <Rows>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                Reminder style
              </p>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                Popup lets you log and snooze. Native uses the OS notification centre.
              </p>
            </div>
            <Segmented<ReminderStyle>
              size="sm"
              value={config.reminder_style}
              onChange={(v) => patch({ reminder_style: v })}
              options={[
                { value: "popup", label: "Popup" },
                { value: "native", label: "Native" },
                { value: "both", label: "Both" },
              ]}
            />
          </div>
          <Toggle
            label="Notification sound"
            description="A soft chime when a popup appears"
            checked={config.sound_enabled}
            onChange={(v) => patch({ sound_enabled: v })}
          />
          <Slider
            label="Snooze length"
            value={config.snooze_minutes}
            onChangeEnd={(v) => patch({ snooze_minutes: v })}
            min={1}
            max={30}
            format={formatMinutes}
          />
          <Slider
            label="Auto-dismiss popup after"
            value={config.popup_auto_dismiss_sec}
            onChangeEnd={(v) => patch({ popup_auto_dismiss_sec: v })}
            min={0}
            max={300}
            step={15}
            format={(v) => (v === 0 ? "Never" : `${v}s`)}
          />
          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
            Medicine popups never auto-dismiss; an unanswered dose stays due until it is marked or
            counted as missed.
          </p>
        </Rows>
      </Card>
    </div>
  );
}
