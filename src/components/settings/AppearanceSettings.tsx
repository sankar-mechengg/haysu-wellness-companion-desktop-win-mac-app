import { useState, useEffect, useCallback } from "react";
import Toggle from "../common/Toggle";
import Card from "../common/Card";
import { useTheme } from "../../hooks/useTheme";
import { useSettings } from "../../hooks/useSettings";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSetting } = useSettings();
  const [widgetOnTop, setWidgetOnTop] = useState(true);
  const [widgetVisible, setWidgetVisible] = useState(true);

  useEffect(() => {
    if (settings) {
      setWidgetOnTop(settings.widget_always_on_top !== "false");
      setWidgetVisible(settings.widget_visible !== "false");
    }
  }, [settings]);

  const handleThemeToggle = useCallback(async () => {
    const next = theme === "light" ? "dark" : "light";
    await setTheme(next);
  }, [theme, setTheme]);

  const handleWidgetOnTop = useCallback(async (checked: boolean) => {
    setWidgetOnTop(checked);
    await updateSetting("widget_always_on_top", String(checked));
    // Note: actual window always-on-top change would need Tauri command
  }, [updateSetting]);

  const handleWidgetVisible = useCallback(async (checked: boolean) => {
    setWidgetVisible(checked);
    await updateSetting("widget_visible", String(checked));
  }, [updateSetting]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Appearance</h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
          Customize how Haysu looks and behaves
        </p>
      </div>

      {/* Theme */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Theme</h4>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
              Currently: {theme === "light" ? "☀️ Light" : "🌙 Dark"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("light")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === "light"
                  ? "bg-haysu-500 text-white"
                  : "bg-surface dark:bg-surface-dark text-text-secondary border border-border dark:border-border-dark"
              }`}
            >
              ☀️ Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === "dark"
                  ? "bg-haysu-500 text-white"
                  : "bg-surface dark:bg-surface-dark text-text-secondary border border-border dark:border-border-dark"
              }`}
            >
              🌙 Dark
            </button>
          </div>
        </div>
      </Card>

      {/* Widget settings */}
      <Card padding="md" className="space-y-4">
        <h4 className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Floating Widget</h4>
        <Toggle
          checked={widgetVisible}
          onChange={handleWidgetVisible}
          label="Show floating widget"
          description="Minimal timer widget visible on your desktop"
        />
        <Toggle
          checked={widgetOnTop}
          onChange={handleWidgetOnTop}
          label="Always on top"
          description="Widget stays above other windows"
        />
      </Card>

      {/* Popup position info */}
      <Card padding="md" variant="transparent">
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center">
          Reminder popups appear from the top center. Drag to reposition.
        </p>
      </Card>
    </div>
  );
}
