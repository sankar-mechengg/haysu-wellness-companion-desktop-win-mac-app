import { useCallback, useState } from "react";
import StepWelcome from "./StepWelcome";
import StepProfile from "./StepProfile";
import StepWorkStyle from "./StepWorkStyle";
import StepLifestyle from "./StepLifestyle";
import StepIntervals from "./StepIntervals";
import StepTheme from "./StepTheme";
import StepFinish from "./StepFinish";
import AnimatedH from "../common/AnimatedH";
import {
  api,
  errorMessage,
  type Diet,
  type DressStyle,
  type HealthGoal,
  type Theme,
  type WorkStyle,
} from "../../lib/api";
import { ADAPTIVE_INTERVALS } from "../../lib/constants";
import { useAppStore } from "../../store/appStore";

export interface OnboardingData {
  name: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  occupation: string;
  work_style: WorkStyle;
  diet: Diet;
  diet_notes: string;
  health_goal: HealthGoal;
  dress_style: DressStyle;
  water_interval: number;
  movement_interval: number;
  theme: Theme;
  autostart: boolean;
  idle_pause: boolean;
}

export interface StepProps {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
  next: () => void;
  back: () => void;
}

const STEPS = 7;

export default function OnboardingWizard() {
  const setConfig = useAppStore((s) => s.setConfig);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    age: 25,
    weight_kg: 70,
    height_cm: 170,
    occupation: "",
    work_style: "sedentary",
    diet: "non_vegetarian",
    diet_notes: "",
    health_goal: "maintain",
    dress_style: "casual",
    water_interval: ADAPTIVE_INTERVALS.sedentary.water,
    movement_interval: ADAPTIVE_INTERVALS.sedentary.movement,
    theme: "system",
    autostart: true,
    idle_pause: true,
  });

  const update = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => {
      const next = { ...prev, ...partial };
      if (partial.work_style) {
        const a = ADAPTIVE_INTERVALS[partial.work_style];
        next.water_interval = a.water;
        next.movement_interval = a.movement;
      }
      return next;
    });
  }, []);

  const next = useCallback(() => setStep((s) => Math.min(STEPS - 1, s + 1)), []);
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const finish = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await api.saveUserProfile({
        name: data.name.trim(),
        age: data.age,
        weight_kg: data.weight_kg,
        height_cm: data.height_cm,
        occupation: data.occupation,
        work_style: data.work_style,
        gender: "",
        diet: data.diet,
        diet_notes: data.diet_notes.trim(),
        cuisines: "",
        health_goal: data.health_goal,
        dress_style: data.dress_style,
        wardrobe_notes: "",
        about_me: "",
      });
      const result = await api.updateConfig({
        water_interval_min: data.water_interval,
        movement_interval_min: data.movement_interval,
        theme: data.theme,
        autostart_enabled: data.autostart,
        idle_pause_enabled: data.idle_pause,
      });
      setConfig(result.config);
      await api.completeOnboarding();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }, [data, setConfig]);

  const props: StepProps = { data, update, next, back };
  const screens = [
    <StepWelcome key="w" {...props} />,
    <StepProfile key="p" {...props} />,
    <StepWorkStyle key="s" {...props} />,
    <StepLifestyle key="l" {...props} />,
    <StepIntervals key="i" {...props} />,
    <StepTheme key="t" {...props} />,
    <StepFinish key="f" {...props} finish={finish} saving={saving} />,
  ];

  return (
    <div className="h-screen w-screen bg-bg dark:bg-bg-dark flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5 pb-3" data-tauri-drag-region>
        <AnimatedH size={28} loading={saving} />
        <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
          {step + 1} / {STEPS}
        </span>
      </div>
      <div className="px-6 mb-4">
        <div className="h-1.5 bg-border/40 dark:bg-border-dark/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-haysu-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS) * 100}%` }}
          />
        </div>
      </div>
      {error && (
        <div className="mx-6 mb-2 p-3 rounded-xl bg-tomato-light dark:bg-tomato/10 border border-tomato/30">
          <p className="text-xs text-tomato font-medium">{error}</p>
        </div>
      )}
      <div className="flex-1 px-6 pb-6 overflow-y-auto" key={step}>
        {screens[step]}
      </div>
    </div>
  );
}
