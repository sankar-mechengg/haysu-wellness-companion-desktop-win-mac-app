import { useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import Card from "../common/Card";
import Toggle from "../common/Toggle";
import Button from "../common/Button";
import { Rows, SectionHeader } from "../common/Section";
import { toast } from "../common/Toast";
import { useConfigPatch } from "../../hooks/useConfigPatch";
import { api, errorMessage } from "../../lib/api";
import { useConfig, useLive } from "../../store/appStore";

const DND_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "Rest of day", minutes: 0 },
];

export default function GeneralSettings() {
  const config = useConfig();
  const live = useLive();
  const patch = useConfigPatch();
  const [resetting, setResetting] = useState(false);
  if (!config) return null;

  const dndUntil = live?.dnd.until ? new Date(live.dnd.until) : null;

  const startDnd = async (minutes: number) => {
    let m = minutes;
    if (m === 0) {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      m = Math.max(1, Math.round((end.getTime() - now.getTime()) / 60000));
    }
    await api.setDnd(true, m);
  };

  const reset = async (scope: "logs" | "all") => {
    const ok = await ask(
      scope === "logs"
        ? "Delete all water, movement, Pomodoro, food and AI chat history? Profile, settings, medicines, diary and routines stay."
        : "Delete everything, including your profile and settings, and start the setup again?",
      { title: "Reset Haysu", kind: "warning", okLabel: "Delete", cancelLabel: "Cancel" }
    );
    if (!ok) return;
    setResetting(true);
    try {
      await api.resetData(scope);
      toast.success(scope === "logs" ? "History cleared" : "Haysu has been reset");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="General"
        description="System integration, Do Not Disturb and your data."
      />

      <Card padding="md">
        <Rows>
          <Toggle
            label="Launch at login"
            description="Start Haysu in the background when you sign in"
            checked={config.autostart_enabled}
            onChange={(v) => patch({ autostart_enabled: v })}
          />
          <Toggle
            label="Check for updates on launch"
            description="Looks at GitHub releases shortly after start. Nothing installs without asking."
            checked={config.check_updates_on_launch}
            onChange={(v) => patch({ check_updates_on_launch: v })}
          />
        </Rows>
      </Card>

      <Card padding="md" variant={config.dnd_enabled ? "tomato" : "default"}>
        <Rows>
          <Toggle
            label="Do Not Disturb"
            description={
              config.dnd_enabled
                ? dndUntil
                  ? `On until ${dndUntil.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
                  : "On until you switch it off"
                : "Pause water and movement reminders"
            }
            checked={config.dnd_enabled}
            onChange={(v) => api.setDnd(v)}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-secondary dark:text-text-secondary-dark mr-1">
              Quick DND
            </span>
            {DND_OPTIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => startDnd(o.minutes)}
                className="h-7 px-2.5 rounded-lg text-xs font-medium bg-surface-hover dark:bg-surface-hover-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark"
              >
                {o.label}
              </button>
            ))}
          </div>
        </Rows>
      </Card>

      <Card padding="md">
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
          Your data
        </h4>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-3">
          Everything stays on this computer in a local SQLite file. Full backups and health
          snapshots live in the Backup tab.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => reset("logs")} disabled={resetting}>
            Clear history
          </Button>
          <Button variant="danger" size="sm" onClick={() => reset("all")} disabled={resetting}>
            Reset everything
          </Button>
        </div>
      </Card>
    </div>
  );
}
