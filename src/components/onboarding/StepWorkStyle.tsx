import Button from "../common/Button";
import Card from "../common/Card";
import { OnboardingData } from "./OnboardingWizard";
import { WORK_STYLES, ADAPTIVE_INTERVALS } from "../../lib/constants";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepWorkStyle({ data, updateData, onNext, onBack }: Props) {
  const selectedAdaptive = ADAPTIVE_INTERVALS[data.work_style];

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          What's your work style?
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Haysu adjusts exercise intensity and reminder frequency based on this.
        </p>
      </div>

      {/* Work style cards */}
      <div className="space-y-3">
        {WORK_STYLES.map((style) => {
          const isSelected = data.work_style === style.id;
          const adaptive = ADAPTIVE_INTERVALS[style.id];
          return (
            <Card
              key={style.id}
              hoverable
              padding="md"
              className={`
                cursor-pointer transition-all
                ${isSelected
                  ? "ring-2 ring-haysu-500 border-haysu-300 dark:border-haysu-500"
                  : ""
                }
              `}
              onClick={() => updateData({ work_style: style.id as OnboardingData["work_style"] })}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{style.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                      {style.label}
                    </h3>
                    {isSelected && (
                      <span className="text-xs bg-haysu-100 dark:bg-haysu-500/20 text-haysu-600 dark:text-haysu-300 px-2 py-0.5 rounded-full font-medium">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
                    {style.description}
                  </p>
                  <div className="flex gap-4 mt-2">
                    <span className="text-xs text-water font-medium">
                      💧 Every {adaptive.water}min
                    </span>
                    <span className="text-xs text-move font-medium">
                      🏃 Every {adaptive.movement}min
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

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
