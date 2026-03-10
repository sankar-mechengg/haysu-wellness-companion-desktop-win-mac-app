import { useMemo } from "react";
import Button from "../common/Button";
import Slider from "../common/Slider";
import { OnboardingData } from "./OnboardingWizard";
import { calculateDailyWater, formatWaterMl } from "../../lib/waterCalc";
import { OCCUPATIONS } from "../../lib/constants";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepProfile({ data, updateData, onNext, onBack }: Props) {
  const waterGoal = useMemo(() => calculateDailyWater(data.weight_kg), [data.weight_kg]);

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          Tell us about yourself
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          This helps Haysu personalize your reminders and calculate your water goal.
        </p>
      </div>

      {/* Age */}
      <Slider
        label="Age"
        value={data.age}
        onChange={(v) => updateData({ age: v })}
        min={16}
        max={80}
        unit=" yrs"
      />

      {/* Weight */}
      <div>
        <Slider
          label="Weight"
          value={data.weight_kg}
          onChange={(v) => updateData({ weight_kg: v })}
          min={30}
          max={150}
          unit=" kg"
        />
        <p className="text-xs text-water mt-1">
          💧 Daily water goal: <span className="font-semibold">{formatWaterMl(waterGoal)}</span>
          <span className="text-text-secondary dark:text-text-secondary-dark"> ({data.weight_kg} × 35ml/kg)</span>
        </p>
      </div>

      {/* Height */}
      <Slider
        label="Height"
        value={data.height_cm}
        onChange={(v) => updateData({ height_cm: v })}
        min={120}
        max={220}
        unit=" cm"
      />

      {/* Occupation */}
      <div>
        <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-2">
          Occupation
        </label>
        <div className="flex flex-wrap gap-2">
          {OCCUPATIONS.map((occ) => (
            <button
              key={occ}
              onClick={() => updateData({ occupation: occ })}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${data.occupation === occ
                  ? "bg-haysu-500 text-white shadow-sm"
                  : "bg-surface dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:border-haysu-300"
                }
              `}
            >
              {occ}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
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
