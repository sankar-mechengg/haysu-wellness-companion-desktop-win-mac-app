import { useState, useCallback } from "react";
import { getCurrentWindow, Window as TauriWindow } from "@tauri-apps/api/window";
import StepWelcome from "./StepWelcome";
import StepProfile from "./StepProfile";
import StepWorkStyle from "./StepWorkStyle";
import StepIntervals from "./StepIntervals";
import StepTheme from "./StepTheme";
import StepAutostart from "./StepAutostart";
import AnimatedH from "../common/AnimatedH";
import { api } from "../../lib/tauriApi";
import { ADAPTIVE_INTERVALS } from "../../lib/constants";
import { calculateDailyWater } from "../../lib/waterCalc";

export interface OnboardingData {
  name: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  occupation: string;
  work_style: "sedentary" | "moderate" | "active";
  water_interval: number;
  movement_interval: number;
  theme: "light" | "dark";
  autostart: boolean;
}

const TOTAL_STEPS = 6;

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    age: 25,
    weight_kg: 70,
    height_cm: 170,
    occupation: "",
    work_style: "sedentary",
    water_interval: 30,
    movement_interval: 45,
    theme: "light",
    autostart: true,
  });

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => {
      const updated = { ...prev, ...partial };
      // Auto-adjust intervals when work style changes
      if (partial.work_style) {
        const adaptive = ADAPTIVE_INTERVALS[partial.work_style];
        updated.water_interval = adaptive.water;
        updated.movement_interval = adaptive.movement;
      }
      return updated;
    });
  }, []);

  const next = useCallback(() => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  }, [step]);

  const back = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await api.saveUserProfile({
        name: data.name,
        age: data.age,
        weight_kg: data.weight_kg,
        height_cm: data.height_cm,
        occupation: data.occupation,
        work_style: data.work_style,
      });

      await api.setMultipleSettings({
        water_interval_min: String(data.water_interval),
        movement_interval_min: String(data.movement_interval),
        theme: data.theme,
        autostart_enabled: String(data.autostart),
        onboarding_complete: "true",
      });

      await api.setWaterInterval(data.water_interval);
      await api.setMovementInterval(data.movement_interval);

      if (data.autostart) {
        await api.enableAutostart().catch(() => {});
      }

      if (data.theme === "dark") {
        document.body.classList.add("dark");
      }

      // Show widget window, then close onboarding
      try {
        const widgetWin = await TauriWindow.getByLabel("widget");
        if (widgetWin) {
          await widgetWin.show();
          await widgetWin.setFocus();
        }
      } catch {
        // Widget window may not exist yet — that's OK
      }
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to save onboarding:", msg);
      setError(msg);
      setSaving(false);
    }
  }, [data]);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepWelcome data={data} updateData={updateData} onNext={next} />;
      case 1:
        return <StepProfile data={data} updateData={updateData} onNext={next} onBack={back} />;
      case 2:
        return <StepWorkStyle data={data} updateData={updateData} onNext={next} onBack={back} />;
      case 3:
        return <StepIntervals data={data} updateData={updateData} onNext={next} onBack={back} />;
      case 4:
        return <StepTheme data={data} updateData={updateData} onNext={next} onBack={back} />;
      case 5:
        return (
          <StepAutostart
            data={data}
            updateData={updateData}
            onFinish={finish}
            onBack={back}
            saving={saving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen bg-bg dark:bg-bg-dark flex flex-col overflow-hidden">
      {/* Header with drag region */}
      <div
        className="flex items-center justify-between px-6 pt-5 pb-3"
        data-tauri-drag-region
      >
        <AnimatedH size={28} loading={saving} />
        <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
          {step + 1} / {TOTAL_STEPS}
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-6 mb-4">
        <div className="h-1.5 bg-border/30 dark:bg-border-dark/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-haysu-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mb-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            Error: {error}
          </p>
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        {renderStep()}
      </div>
    </div>
  );
}
