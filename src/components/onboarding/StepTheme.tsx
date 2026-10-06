import { useEffect } from "react";
import Button from "../common/Button";
import type { StepProps } from "./OnboardingWizard";
import type { Theme } from "../../lib/api";

const THEMES: { id: Theme; label: string; emoji: string; desc: string }[] = [
  { id: "light", label: "Light", emoji: "☀️", desc: "Clean and bright" },
  { id: "dark", label: "Dark", emoji: "🌙", desc: "Easy on the eyes at night" },
  { id: "system", label: "System", emoji: "🖥️", desc: "Follows your OS" },
];

export default function StepTheme({ data, update, next, back }: StepProps) {
  // Live preview in this window.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const dark = data.theme === "dark" || (data.theme === "system" && media.matches);
    document.documentElement.classList.toggle("dark", dark);
  }, [data.theme]);

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          Pick a theme
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Applies to every Haysu window. Change it any time.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {THEMES.map((t) => {
          const selected = data.theme === t.id;
          const previewDark =
            t.id === "dark" ||
            (t.id === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => update({ theme: t.id })}
              className={`rounded-2xl p-3 text-left transition-all border-2 ${
                selected
                  ? "border-haysu-500 shadow-md"
                  : "border-border dark:border-border-dark hover:border-haysu-300"
              }`}
            >
              <div
                className={`${previewDark ? "bg-gray-900" : "bg-white"} rounded-xl p-3 mb-3 shadow-inner`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-haysu-500" />
                  <div
                    className={`h-1.5 w-10 rounded-full ${previewDark ? "bg-gray-700" : "bg-gray-200"}`}
                  />
                </div>
                <div className="mt-2 space-y-1">
                  <div
                    className={`h-1 w-full rounded-full ${previewDark ? "bg-blue-900" : "bg-blue-100"}`}
                  />
                  <div
                    className={`h-1 w-3/4 rounded-full ${previewDark ? "bg-green-900" : "bg-green-100"}`}
                  />
                  <div
                    className={`h-1 w-1/2 rounded-full ${previewDark ? "bg-red-900" : "bg-red-100"}`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{t.emoji}</span>
                <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                  {t.label}
                </span>
                {selected && <span className="text-xs text-haysu-500">✓</span>}
              </div>
              <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark mt-0.5">
                {t.desc}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={back}>
          ← Back
        </Button>
        <Button variant="primary" fullWidth onClick={next}>
          Almost done →
        </Button>
      </div>
    </div>
  );
}
