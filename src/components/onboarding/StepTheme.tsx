import { useEffect } from "react";
import Button from "../common/Button";
import { OnboardingData } from "./OnboardingWizard";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepTheme({ data, updateData, onNext, onBack }: Props) {
  // Live preview of theme
  useEffect(() => {
    if (data.theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [data.theme]);

  const themes: { id: "light" | "dark"; label: string; emoji: string; desc: string; previewBg: string; previewText: string }[] = [
    {
      id: "light",
      label: "Light",
      emoji: "☀️",
      desc: "Clean and bright, easy on the eyes during the day",
      previewBg: "bg-white",
      previewText: "text-gray-800",
    },
    {
      id: "dark",
      label: "Dark",
      emoji: "🌙",
      desc: "Gentle on the eyes for late-night sessions",
      previewBg: "bg-gray-900",
      previewText: "text-gray-100",
    },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          Pick your theme
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          You can always change this later in settings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {themes.map((t) => {
          const isSelected = data.theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => updateData({ theme: t.id })}
              className={`
                rounded-2xl p-4 text-left transition-all
                border-2
                ${isSelected
                  ? "border-haysu-500 shadow-md"
                  : "border-border dark:border-border-dark hover:border-haysu-300"
                }
              `}
            >
              {/* Mini preview */}
              <div className={`${t.previewBg} rounded-xl p-3 mb-3 shadow-inner`}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-haysu-500 flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">H</span>
                  </div>
                  <div className={`h-1.5 w-12 rounded-full ${t.id === "light" ? "bg-gray-200" : "bg-gray-700"}`} />
                </div>
                <div className="mt-2 space-y-1">
                  <div className={`h-1 w-full rounded-full ${t.id === "light" ? "bg-blue-100" : "bg-blue-900"}`} />
                  <div className={`h-1 w-3/4 rounded-full ${t.id === "light" ? "bg-green-100" : "bg-green-900"}`} />
                  <div className={`h-1 w-1/2 rounded-full ${t.id === "light" ? "bg-red-100" : "bg-red-900"}`} />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span>{t.emoji}</span>
                <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                  {t.label}
                </span>
                {isSelected && (
                  <span className="text-xs text-haysu-500 font-medium">✓</span>
                )}
              </div>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed">
                {t.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" size="md" onClick={onBack}>
          ← Back
        </Button>
        <Button variant="primary" size="md" fullWidth onClick={onNext}>
          Almost done →
        </Button>
      </div>
    </div>
  );
}
