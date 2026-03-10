import Button from "../common/Button";
import Toggle from "../common/Toggle";
import Card from "../common/Card";
import AnimatedH from "../common/AnimatedH";
import { OnboardingData } from "./OnboardingWizard";
import { calculateDailyWater, formatWaterMl } from "../../lib/waterCalc";
import { HOTKEYS } from "../../lib/constants";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onFinish: () => void;
  onBack: () => void;
  saving: boolean;
}

export default function StepAutostart({ data, updateData, onFinish, onBack, saving }: Props) {
  const waterGoal = calculateDailyWater(data.weight_kg);

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          You're all set, {data.name}! 🎉
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Here's a summary of your setup. Hit finish to start using Haysu.
        </p>
      </div>

      {/* Autostart toggle */}
      <Card padding="md">
        <Toggle
          checked={data.autostart}
          onChange={(v) => updateData({ autostart: v })}
          label="Launch Haysu on startup"
          description="Haysu starts automatically when you log into your computer"
        />
      </Card>

      {/* Summary */}
      <Card padding="md" className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">
          Your Setup
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-text-secondary dark:text-text-secondary-dark">Name</span>
            <p className="font-medium text-text-primary dark:text-text-primary-dark">{data.name}</p>
          </div>
          <div>
            <span className="text-text-secondary dark:text-text-secondary-dark">Work Style</span>
            <p className="font-medium text-text-primary dark:text-text-primary-dark capitalize">{data.work_style}</p>
          </div>
          <div>
            <span className="text-text-secondary dark:text-text-secondary-dark">💧 Water Goal</span>
            <p className="font-medium text-water">{formatWaterMl(waterGoal)}/day</p>
          </div>
          <div>
            <span className="text-text-secondary dark:text-text-secondary-dark">💧 Water Interval</span>
            <p className="font-medium text-water">Every {data.water_interval}min</p>
          </div>
          <div>
            <span className="text-text-secondary dark:text-text-secondary-dark">🏃 Move Interval</span>
            <p className="font-medium text-move">Every {data.movement_interval}min</p>
          </div>
          <div>
            <span className="text-text-secondary dark:text-text-secondary-dark">🍅 Pomodoro</span>
            <p className="font-medium text-tomato">25 / 5 / 15 min</p>
          </div>
        </div>
      </Card>

      {/* Hotkey reference */}
      <Card padding="sm" variant="transparent">
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center">
          <span className="font-mono bg-surface dark:bg-surface-dark px-1.5 py-0.5 rounded text-text-primary dark:text-text-primary-dark">
            {HOTKEYS.togglePomodoro.label}
          </span>
          {" "}Pomodoro{"  "}
          <span className="font-mono bg-surface dark:bg-surface-dark px-1.5 py-0.5 rounded text-text-primary dark:text-text-primary-dark">
            {HOTKEYS.toggleDnd.label}
          </span>
          {" "}DND
        </p>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <Button variant="ghost" size="md" onClick={onBack} disabled={saving}>
          ← Back
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onFinish}
          disabled={saving}
          icon={saving ? <AnimatedH size={18} loading /> : undefined}
        >
          {saving ? "Setting up..." : "Finish & Start Haysu ✨"}
        </Button>
      </div>
    </div>
  );
}
