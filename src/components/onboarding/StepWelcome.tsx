import { useState } from "react";
import Button from "../common/Button";
import AnimatedH from "../common/AnimatedH";
import { OnboardingData } from "./OnboardingWizard";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
}

export default function StepWelcome({ data, updateData, onNext }: Props) {
  const [nameError, setNameError] = useState(false);

  const handleNext = () => {
    if (!data.name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    onNext();
  };

  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
      {/* Animated logo */}
      <div className="mb-6 mt-2">
        <AnimatedH size={72} color="#3b93f7" />
      </div>

      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-2">
        Welcome to Haysu
      </h1>
      <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-8 max-w-xs">
        Your desktop wellness companion. Let's set things up so Haysu can take care of you.
      </p>

      {/* Name input */}
      <div className="w-full max-w-xs">
        <label className="block text-left text-sm font-medium text-text-primary dark:text-text-primary-dark mb-2">
          What should we call you?
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => {
            updateData({ name: e.target.value });
            if (e.target.value.trim()) setNameError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleNext()}
          placeholder="Your name"
          autoFocus
          className={`
            w-full px-4 py-3 rounded-xl text-sm
            bg-surface dark:bg-surface-dark
            border ${nameError ? "border-red-400" : "border-border dark:border-border-dark"}
            text-text-primary dark:text-text-primary-dark
            placeholder:text-text-secondary/50
            focus:outline-none focus:ring-2 focus:ring-haysu-300 focus:border-transparent
            transition-colors
          `}
        />
        {nameError && (
          <p className="text-xs text-red-500 mt-1.5 text-left">
            Please enter your name to continue
          </p>
        )}
      </div>

      <div className="w-full max-w-xs mt-8">
        <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
          Let's Go →
        </Button>
      </div>
    </div>
  );
}
