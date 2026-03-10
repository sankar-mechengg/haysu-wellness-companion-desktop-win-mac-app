import { useState } from "react";
import DailyView from "./DailyView";
import WeeklyView from "./WeeklyView";
import ExportButton from "./ExportButton";
import AnimatedH from "../common/AnimatedH";
import { useAppStore } from "../../store/appStore";

type Tab = "daily" | "weekly";

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<Tab>("daily");
  const userName = useAppStore((s) => s.userName);

  return (
    <div className="h-screen w-screen bg-bg dark:bg-bg-dark flex flex-col">
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AnimatedH size={28} />
            <div>
              <h1 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
                Dashboard
              </h1>
              {userName && (
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  Hey {userName}, here's how you're doing
                </p>
              )}
            </div>
          </div>
          <ExportButton />
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-surface dark:bg-surface-dark rounded-xl p-1 border border-border/50 dark:border-border-dark/50">
          <TabButton
            active={activeTab === "daily"}
            onClick={() => setActiveTab("daily")}
          >
            📋 Today
          </TabButton>
          <TabButton
            active={activeTab === "weekly"}
            onClick={() => setActiveTab("weekly")}
          >
            📊 Weekly
          </TabButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === "daily" ? <DailyView /> : <WeeklyView />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-200
        ${active
          ? "bg-haysu-500 text-white shadow-sm"
          : "text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark"
        }
      `}
    >
      {children}
    </button>
  );
}
