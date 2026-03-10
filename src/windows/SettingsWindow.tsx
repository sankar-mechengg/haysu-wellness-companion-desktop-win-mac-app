import { useEffect } from "react";
import SettingsLayout from "../components/settings/SettingsLayout";
import { useTheme } from "../hooks/useTheme";

export default function SettingsWindow() {
  const { initTheme } = useTheme();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return <SettingsLayout />;
}
