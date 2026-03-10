import Button from "../common/Button";
import Slider from "../common/Slider";
import Card from "../common/Card";
import { OnboardingData } from "./OnboardingWizard";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepIntervals({ data, updateData, onNext, onBack }: Props) {
  // Calculate daily reminders
  const hoursPerDay = 8; // assume 8 hour workday
  const waterReminders = Math.floor((hoursPerDay * 60) / data.water_interval);
  const moveReminders = Math.floor((hoursPerDay * 60) / data.movement_interval);

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          Reminder intervals
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Pre-set based on your work style. Adjust if you'd like.
        </p>
      </div>

      {/* Water interval */}
      <Card variant="water" padding="md">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💧</span>
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            Water Reminders
          </h3>
        </div>
        <Slider
          value={data.water_interval}
          onChange={(v) => updateData({ water_interval: v })}
          min={10}
          max={90}
          step={5}
          unit=" min"
        />
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-2">
          ≈ {waterReminders} reminders in an 8-hour workday
        </p>
      </Card>

      {/* Movement interval */}
      <Card variant="move" padding="md">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🏃</span>
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            Movement Reminders
          </h3>
        </div>
        <Slider
          value={data.movement_interval}
          onChange={(v) => updateData({ movement_interval: v })}
          min={15}
          max={120}
          step={5}
          unit=" min"
        />
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-2">
          ≈ {moveReminders} reminders in an 8-hour workday
        </p>
      </Card>

      {/* Pomodoro info (not configurable here, just info) */}
      <Card variant="tomato" padding="md">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍅</span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              Pomodoro Timer
            </h3>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
              Classic 25min work / 5min break / 15min long break.
              Start anytime with <span className="font-mono text-tomato">Ctrl+Shift+J</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <Button variant="ghost" size="md" onClick={onBack}>
          ← Back
        </Button>
        <Button variant="primary" size="md" fullWidth onClick={onNext}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
