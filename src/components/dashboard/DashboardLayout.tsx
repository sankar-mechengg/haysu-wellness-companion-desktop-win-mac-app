import { useCallback, useEffect, useState } from "react";
import TodayView from "./TodayView";
import WeekView from "./WeekView";
import HealthView from "./health/HealthView";
import AssistantView from "./assistant/AssistantView";
import ExportButton from "./ExportButton";
import UpdateBanner from "./UpdateBanner";
import AnimatedH from "../common/AnimatedH";
import Segmented from "../common/Segmented";
import { ImportDialog } from "../settings/BackupSettings";
import { api, EVENTS, type AiKind } from "../../lib/api";
import { useHealthSync } from "../../hooks/useHealth";
import { useTauriEvent } from "../../hooks/useTauriEvent";
import { useAiStore } from "../../hooks/useAi";
import { useLive, useProfile } from "../../store/appStore";

export type DashboardTab = "today" | "week" | "health" | "ai";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Winding down";
}

export default function DashboardLayout() {
  const [tab, setTab] = useState<DashboardTab>("today");
  const [aiConversation, setAiConversation] = useState<number | null>(null);
  const [aiKick, setAiKick] = useState<{ kind: AiKind; n: number } | null>(null);
  const [importPath, setImportPath] = useState<string | null>(null);
  const profile = useProfile();
  const live = useLive();
  const aiReady = useAiStore((s) => !!s.status?.active);
  useHealthSync();

  const pending = live?.doses_pending ?? 0;

  // Jump to the assistant (hotkey, popup "Read briefing", widget "Ask").
  useTauriEvent<number | null>(EVENTS.openAssistant, (id) => {
    setAiConversation(typeof id === "number" ? id : null);
    setTab("ai");
  });

  // A .hay/.su file was opened (double-click / drag onto the exe).
  const takePending = useCallback(() => {
    api
      .backupTakePendingImport()
      .then((p) => p && setImportPath(p))
      .catch(() => {});
  }, []);
  useEffect(takePending, [takePending]);
  useTauriEvent<string>(EVENTS.importFile, (p) => setImportPath(p));

  /** Open the AI tab and fire a quick action immediately. */
  const askAi = useCallback((kind: AiKind) => {
    setAiConversation(null);
    setAiKick((k) => ({ kind, n: (k?.n ?? 0) + 1 }));
    setTab("ai");
  }, []);

  return (
    <div className="haysu-shell h-screen w-screen bg-bg dark:bg-bg-dark flex flex-col">
      <header className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <AnimatedH size={32} />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-text-primary dark:text-text-primary-dark leading-tight">
                {greeting()}
                {profile?.name ? `, ${profile.name}` : ""}
              </h1>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark truncate">
                Here's how you're taking care of yourself.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ExportButton />
            <button
              type="button"
              onClick={() => api.showWindow("settings")}
              className="h-8 px-3 rounded-xl text-xs font-medium border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text-primary dark:text-text-primary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
        <UpdateBanner />
        <Segmented<DashboardTab>
          value={tab}
          onChange={setTab}
          fullWidth
          ariaLabel="Dashboard view"
          options={[
            { value: "today", label: "Today", icon: "📋" },
            { value: "week", label: "This week", icon: "📊" },
            {
              value: "health",
              label: pending > 0 ? `Health (${pending} due)` : "Health",
              icon: "💊",
            },
            { value: "ai", label: aiReady ? "Haysu AI" : "Haysu AI (set up)", icon: "✨" },
          ]}
        />
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-6">
        {tab === "today" && <TodayView onAsk={askAi} />}
        {tab === "week" && <WeekView />}
        {tab === "health" && <HealthView onAsk={askAi} />}
        {tab === "ai" && <AssistantView initialConversation={aiConversation} kick={aiKick} />}
      </main>

      {importPath && <ImportDialog path={importPath} onClose={() => setImportPath(null)} />}
    </div>
  );
}
