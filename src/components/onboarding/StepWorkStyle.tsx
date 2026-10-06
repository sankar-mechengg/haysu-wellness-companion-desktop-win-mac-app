import Button from "../common/Button";
import Card from "../common/Card";
import type { StepProps } from "./OnboardingWizard";
import { ADAPTIVE_INTERVALS, WORK_STYLES } from "../../lib/constants";

export default function StepWorkStyle({ data, update, next, back }: StepProps) {
  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          What's your work style?
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Sets your reminder rhythm and keeps standing or vigorous exercises out of a desk-bound
          day.
        </p>
      </div>

      <div className="space-y-3">
        {WORK_STYLES.map((style) => {
          const selected = data.work_style === style.id;
          const a = ADAPTIVE_INTERVALS[style.id];
          return (
            <Card
              key={style.id}
              hoverable
              padding="md"
              className={`cursor-pointer ${selected ? "ring-2 ring-haysu-500 border-haysu-300 dark:border-haysu-500" : ""}`}
              onClick={() => update({ work_style: style.id })}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{style.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                      {style.label}
                    </h3>
                    {selected && (
                      <span className="text-[10px] bg-haysu-100 dark:bg-haysu-500/20 text-haysu-600 dark:text-haysu-300 px-2 py-0.5 rounded-full font-medium">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
                    {style.description}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs font-medium">
                    <span className="text-water">💧 every {a.water} min</span>
                    <span className="text-move">🏃 every {a.movement} min</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

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
