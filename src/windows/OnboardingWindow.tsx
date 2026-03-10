import { useEffect } from "react";
import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import { useTheme } from "../hooks/useTheme";

export default function OnboardingWindow() {
  const { initTheme } = useTheme();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return <OnboardingWizard />;
}
