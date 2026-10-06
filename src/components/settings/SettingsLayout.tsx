import { useEffect, useState } from "react";
import { useTauriEvent } from "../../hooks/useTauriEvent";
import { EVENTS } from "../../lib/api";
import ProfileSettings from "./ProfileSettings";
import ReminderSettings from "./ReminderSettings";
import PomodoroSettings from "./PomodoroSettings";
import ScheduleSettings from "./ScheduleSettings";
import AppearanceSettings from "./AppearanceSettings";
import HotkeySettings from "./HotkeySettings";
import GeneralSettings from "./GeneralSettings";
import AboutSettings from "./AboutSettings";
import AiSettings from "./AiSettings";
import BackupSettings from "./BackupSettings";
import { useAiSync } from "../../hooks/useAi";
import AnimatedH from "../common/AnimatedH";
import { useAppStore } from "../../store/appStore";

type Tab =
  | "profile"
  | "reminders"
  | "pomodoro"
  | "schedule"
  | "appearance"
  | "hotkeys"
  | "general"
  | "ai"
  | "backup"
  | "about";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "reminders", label: "Reminders", icon: "⏰" },
  { id: "pomodoro", label: "Pomodoro", icon: "🍅" },
  { id: "schedule", label: "Schedule", icon: "📅" },
  { id: "appearance", label: "Appearance", icon: "🎨" },
  { id: "hotkeys", label: "Hotkeys", icon: "⌨️" },
  { id: "ai", label: "Haysu AI", icon: "✨" },
  { id: "backup", label: "Backup", icon: "📦" },
  { id: "general", label: "General", icon: "⚙️" },
  { id: "about", label: "About", icon: "ℹ️" },
];

export default function SettingsLayout() {
  const [tab, setTab] = useState<Tab>("profile");
  const hotkeyErrors = useAppStore((s) => s.hotkeyErrors);
  useAiSync();
  useTauriEvent<string>(EVENTS.openSettingsTab, (t) => {
    if (TABS.some((x) => x.id === t)) setTab(t as Tab);
  });
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && TABS.some((x) => x.id === t)) setTab(t as Tab);
  }, []);

  const content = {
    profile: <ProfileSettings />,
    reminders: <ReminderSettings />,
    pomodoro: <PomodoroSettings />,
    schedule: <ScheduleSettings />,
    appearance: <AppearanceSettings />,
    hotkeys: <HotkeySettings />,
    general: <GeneralSettings />,
    ai: <AiSettings />,
    backup: <BackupSettings />,
    about: <AboutSettings />,
  }[tab];

  return (
    <div className="h-screen w-screen bg-bg dark:bg-bg-dark flex flex-col">
      <div className="px-5 pt-4 pb-3 flex items-center gap-2.5">
        <AnimatedH size={26} />
        <h1 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
          Settings
        </h1>
        <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark ml-auto">
          Changes save automatically
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-44 flex-shrink-0 border-r border-border/50 dark:border-border-dark/50 px-2 py-2 space-y-0.5 overflow-y-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                tab === t.id
                  ? "bg-haysu-500/10 text-haysu-600 dark:text-haysu-300"
                  : "text-text-secondary dark:text-text-secondary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark hover:text-text-primary dark:hover:text-text-primary-dark"
              }`}
            >
              <span className="text-sm">{t.icon}</span>
              {t.label}
              {t.id === "hotkeys" && hotkeyErrors.length > 0 && (
                <span
                  className="ml-auto w-2 h-2 rounded-full bg-tomato"
                  title="Some hotkeys could not be registered"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-6 py-4 pb-8 animate-fade-in" key={tab}>
          {content}
        </div>
      </div>
    </div>
  );
}
