import { useState } from "react";
import Button from "../common/Button";
import AnimatedH from "../common/AnimatedH";
import type { StepProps } from "./OnboardingWizard";

export default function StepWelcome({ data, update, next }: StepProps) {
  const [touched, setTouched] = useState(false);
  const invalid = !data.name.trim();

  const go = () => {
    setTouched(true);
    if (!invalid) next();
  };

  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
      <div className="mb-5 mt-2">
        <AnimatedH size={72} />
      </div>
      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-2">
        Welcome to Haysu
      </h1>
      <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-8 max-w-xs">
        Water reminders, movement breaks and a Pomodoro timer that live quietly in your tray.
      </p>

      <div className="w-full max-w-xs">
        <label className="block text-left text-sm font-medium text-text-primary dark:text-text-primary-dark mb-2">
          What should we call you?
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="Your name"
          maxLength={40}
          autoFocus
          className={`w-full px-4 py-3 rounded-xl text-sm bg-surface dark:bg-surface-dark border text-text-primary dark:text-text-primary-dark placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-haysu-300 focus:border-transparent ${
            touched && invalid ? "border-tomato" : "border-border dark:border-border-dark"
          }`}
        />
        {touched && invalid && (
          <p className="text-xs text-tomato mt-1.5 text-left">
            Please enter your name to continue.
          </p>
        )}
      </div>

      <div className="w-full max-w-xs mt-8">
        <Button variant="primary" size="lg" fullWidth onClick={go}>
          Let's go →
        </Button>
      </div>
    </div>
  );
}
