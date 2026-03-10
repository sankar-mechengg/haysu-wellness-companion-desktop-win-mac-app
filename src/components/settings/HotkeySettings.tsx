import Card from "../common/Card";
import { HOTKEYS } from "../../lib/constants";

export default function HotkeySettings() {
  const hotkeys = [
    {
      action: "Toggle Pomodoro",
      description: "Start, pause, or resume the Pomodoro timer",
      shortcut: HOTKEYS.togglePomodoro.label,
      macShortcut: HOTKEYS.togglePomodoro.mac,
      icon: "🍅",
    },
    {
      action: "Toggle DND",
      description: "Enable or disable Do Not Disturb mode",
      shortcut: HOTKEYS.toggleDnd.label,
      macShortcut: HOTKEYS.toggleDnd.mac,
      icon: "🔕",
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Keyboard Shortcuts</h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
          Global hotkeys work even when Haysu is in the background
        </p>
      </div>

      <div className="space-y-3">
        {hotkeys.map((hk) => (
          <Card key={hk.action} padding="md">
            <div className="flex items-center gap-3">
              <span className="text-lg">{hk.icon}</span>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                  {hk.action}
                </h4>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
                  {hk.description}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block font-mono text-xs bg-surface dark:bg-surface-dark px-2.5 py-1.5 rounded-lg border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark shadow-sm">
                  {hk.shortcut}
                </span>
                <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1">
                  Mac: {hk.macShortcut}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card padding="sm" variant="transparent">
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center leading-relaxed">
          If a shortcut conflicts with another app, you may need to close
          that app or change its shortcut. Haysu shortcuts are not
          customizable in this version.
        </p>
      </Card>
    </div>
  );
}
