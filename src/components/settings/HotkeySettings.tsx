import Card from "../common/Card";
import HotkeyRecorder from "../common/HotkeyRecorder";
import { Rows, SectionHeader } from "../common/Section";
import { useConfigPatch } from "../../hooks/useConfigPatch";
import { useAppStore, useConfig } from "../../store/appStore";
import type { AppConfig } from "../../lib/api";

const HOTKEYS: { field: keyof AppConfig; label: string; description: string; icon: string }[] = [
  {
    field: "hotkey_toggle_pomodoro",
    label: "Toggle Pomodoro",
    description: "Start, pause or resume the timer",
    icon: "🍅",
  },
  {
    field: "hotkey_toggle_dnd",
    label: "Toggle Do Not Disturb",
    description: "Silence all reminders",
    icon: "🔕",
  },
  {
    field: "hotkey_show_dashboard",
    label: "Open dashboard",
    description: "Bring the dashboard to the front",
    icon: "📊",
  },
  {
    field: "hotkey_log_water",
    label: "Log a glass of water",
    description: "Logs your default amount instantly",
    icon: "💧",
  },
];

const DEFAULTS: Partial<AppConfig> = {
  hotkey_toggle_pomodoro: "CmdOrCtrl+Shift+J",
  hotkey_toggle_dnd: "CmdOrCtrl+Shift+K",
  hotkey_show_dashboard: "CmdOrCtrl+Shift+H",
  hotkey_log_water: "",
};

export default function HotkeySettings() {
  const config = useConfig();
  const errors = useAppStore((s) => s.hotkeyErrors);
  const patch = useConfigPatch();
  if (!config) return null;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Keyboard shortcuts"
        description="Global, they work while any app is focused. Click a shortcut and press a new combination."
        action={
          <button
            type="button"
            onClick={() => patch(DEFAULTS, "Default shortcuts restored")}
            className="text-xs text-haysu-500 hover:text-haysu-600 font-medium"
          >
            Restore defaults
          </button>
        }
      />

      <Card padding="md">
        <Rows>
          {HOTKEYS.map((h) => (
            <div key={h.field} className="flex items-center gap-3">
              <span className="text-lg w-7 text-center">{h.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                  {h.label}
                </p>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  {h.description}
                </p>
              </div>
              <HotkeyRecorder
                value={config[h.field] as string}
                onChange={(combo) => patch({ [h.field]: combo } as Partial<AppConfig>)}
                error={errors.find((e) => e.field === h.field)?.error}
              />
            </div>
          ))}
        </Rows>
      </Card>

      <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark leading-relaxed">
        A shortcut needs at least one modifier (Ctrl / ⌘, Alt, Shift). If another app already owns
        the combination the registration fails and the error shows next to it. Backspace while
        recording clears a shortcut.
      </p>
    </div>
  );
}
