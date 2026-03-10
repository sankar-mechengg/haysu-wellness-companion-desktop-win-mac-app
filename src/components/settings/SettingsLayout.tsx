import { useState } from "react";
import ProfileSettings from "./ProfileSettings";
import ReminderSettings from "./ReminderSettings";
import PomodoroSettings from "./PomodoroSettings";
import AppearanceSettings from "./AppearanceSettings";
import HotkeySettings from "./HotkeySettings";
import GeneralSettings from "./GeneralSettings";
import AnimatedH from "../common/AnimatedH";

type SettingsTab = "profile" | "reminders" | "pomodoro" | "appearance" | "hotkeys" | "general";

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "reminders", label: "Reminders", icon: "⏰" },
  { id: "pomodoro", label: "Pomodoro", icon: "🍅" },
  { id: "appearance", label: "Appearance", icon: "🎨" },
  { id: "hotkeys", label: "Hotkeys", icon: "⌨️" },
  { id: "general", label: "General", icon: "⚙️" },
];

export default function SettingsLayout() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings />;
      case "reminders":
        return <ReminderSettings />;
      case "pomodoro":
        return <PomodoroSettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "hotkeys":
        return <HotkeySettings />;
      case "general":
        return <GeneralSettings />;
    }
  };

  return (
    <div className="h-screen w-screen bg-bg dark:bg-bg-dark flex flex-col">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-2.5">
        <AnimatedH size={24} />
        <h1 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
          Settings
        </h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-40 flex-shrink-0 border-r border-border/50 dark:border-border-dark/50 px-2 py-2 space-y-0.5 overflow-y-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium
                transition-all duration-150
                ${activeTab === tab.id
                  ? "bg-haysu-500/10 text-haysu-600 dark:text-haysu-300"
                  : "text-text-secondary dark:text-text-secondary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark hover:text-text-primary dark:hover:text-text-primary-dark"
                }
              `}
            >
              <span className="text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 pb-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
