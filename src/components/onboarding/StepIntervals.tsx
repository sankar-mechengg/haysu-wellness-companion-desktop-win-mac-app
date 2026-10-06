import Button from "../common/Button";
import Slider from "../common/Slider";
import Card from "../common/Card";
import Toggle from "../common/Toggle";
import type { StepProps } from "./OnboardingWizard";
import { formatMinutes } from "../../lib/format";

export default function StepIntervals({ data, update, next, back }: StepProps) {
  const perDay = (min: number) => Math.floor((8 * 60) / min);

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          Reminder rhythm
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Pre-set for your work style. You can fine-tune everything later in Settings.
        </p>
      </div>

      <Card variant="water" padding="md">
        <Slider
          label="💧 Water"
          value={data.water_interval}
          onChange={(v) => update({ water_interval: v })}
          min={10}
          max={120}
          step={5}
          format={formatMinutes}
        />
        <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
          ≈ {perDay(data.water_interval)} reminders in an 8-hour day
        </p>
      </Card>

      <Card variant="move" padding="md">
        <Slider
          label="🏃 Movement"
          value={data.movement_interval}
          onChange={(v) => update({ movement_interval: v })}
          min={15}
          max={180}
          step={5}
          format={formatMinutes}
        />
        <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
          ≈ {perDay(data.movement_interval)} breaks in an 8-hour day
        </p>
      </Card>

      <Card padding="md">
        <Toggle
          label="Pause when I'm away"
          description="No input for 5 minutes pauses the countdowns, so you don't come back to a pile of reminders"
          checked={data.idle_pause}
          onChange={(v) => update({ idle_pause: v })}
        />
      </Card>

      <div className="flex gap-3 pt-1">
        <Button variant="ghost" onClick={back}>
          ← Back
        </Button>
        <Button variant="primary" fullWidth onClick={next}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
