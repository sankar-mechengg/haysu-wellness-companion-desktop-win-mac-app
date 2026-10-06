import Button from "../common/Button";
import type { StepProps } from "./OnboardingWizard";
import { DIET_OPTIONS, DRESS_OPTIONS, GOAL_OPTIONS } from "../../lib/constants";

const chip = (active: boolean) =>
  `px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
    active
      ? "bg-haysu-500 text-white shadow-sm"
      : "bg-surface dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:border-haysu-300"
  }`;
const label = "block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-2";

export default function StepLifestyle({ data, update, next, back }: StepProps) {
  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          Food, goals and style
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Haysu AI uses these for meal ideas and outfit advice. You can refine everything later in
          Settings → Profile.
        </p>
      </div>

      <div>
        <label className={label}>How do you eat?</label>
        <div className="flex flex-wrap gap-2">
          {DIET_OPTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => update({ diet: d.id })}
              className={chip(data.diet === d.id)}
            >
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
        <input
          value={data.diet_notes}
          onChange={(e) => update({ diet_notes: e.target.value })}
          placeholder="Allergies or rules, e.g. no peanuts, Jain, lactose-free (optional)"
          maxLength={300}
          className="mt-2 w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300"
        />
      </div>

      <div>
        <label className={label}>Main goal right now</label>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => update({ health_goal: g.id })}
              className={chip(data.health_goal === g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>Usual dress style</label>
        <div className="flex flex-wrap gap-2">
          {DRESS_OPTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => update({ dress_style: d.id })}
              className={chip(data.dress_style === d.id)}
            >
              {d.emoji} {d.label}
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
