import Button from "../common/Button";
import Slider from "../common/Slider";
import type { StepProps } from "./OnboardingWizard";
import { calculateDailyWater, formatWaterMl } from "../../lib/format";
import { OCCUPATIONS } from "../../lib/constants";

export default function StepProfile({ data, update, next, back }: StepProps) {
  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          Tell us about yourself
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Used only on this computer, to size your water goal and pick suitable exercises.
        </p>
      </div>

      <Slider
        label="Age"
        value={data.age}
        onChange={(v) => update({ age: v })}
        min={13}
        max={100}
        unit=" yrs"
      />
      <div>
        <Slider
          label="Weight"
          value={data.weight_kg}
          onChange={(v) => update({ weight_kg: v })}
          min={30}
          max={200}
          unit=" kg"
        />
        <p className="text-xs text-water mt-1">
          💧 Daily water goal:{" "}
          <span className="font-semibold">
            {formatWaterMl(calculateDailyWater(data.weight_kg))}
          </span>
          <span className="text-text-secondary dark:text-text-secondary-dark">
            {" "}
            ({data.weight_kg} kg × 35 ml)
          </span>
        </p>
      </div>
      <Slider
        label="Height"
        value={data.height_cm}
        onChange={(v) => update({ height_cm: v })}
        min={120}
        max={230}
        unit=" cm"
      />

      <div>
        <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-2">
          Occupation
        </label>
        <div className="flex flex-wrap gap-2">
          {OCCUPATIONS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => update({ occupation: o })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                data.occupation === o
                  ? "bg-haysu-500 text-white shadow-sm"
                  : "bg-surface dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:border-haysu-300"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
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
