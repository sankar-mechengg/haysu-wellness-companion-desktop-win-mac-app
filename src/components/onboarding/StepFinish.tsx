import Button from "../common/Button";
import Toggle from "../common/Toggle";
import Card from "../common/Card";
import AnimatedH from "../common/AnimatedH";
import type { StepProps } from "./OnboardingWizard";
import { calculateDailyWater, formatHotkey, formatWaterMl } from "../../lib/format";
import { usePlatform } from "../../store/appStore";

export default function StepFinish({
  data,
  update,
  back,
  finish,
  saving,
}: StepProps & { finish: () => void; saving: boolean }) {
  const platform = usePlatform();
  const item = (
    label: string,
    value: string,
    cls = "text-text-primary dark:text-text-primary-dark"
  ) => (
    <div>
      <span className="text-text-secondary dark:text-text-secondary-dark">{label}</span>
      <p className={`font-medium ${cls}`}>{value}</p>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          You're all set, {data.name.trim()} 🎉
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Haysu lives in your system tray. The floating widget shows what's coming next.
        </p>
      </div>

      <Card padding="md">
        <Toggle
          label="Launch at login"
          description="Start Haysu in the background when you sign in"
          checked={data.autostart}
          onChange={(v) => update({ autostart: v })}
        />
      </Card>

      <Card padding="md">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">
          Your setup
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {item("Work style", data.work_style)}
          {item("Theme", data.theme)}
          {item(
            "💧 Water goal",
            `${formatWaterMl(calculateDailyWater(data.weight_kg))} / day`,
            "text-water"
          )}
          {item("💧 Water every", `${data.water_interval} min`, "text-water")}
          {item("🏃 Move every", `${data.movement_interval} min`, "text-move")}
          {item("🍅 Pomodoro", "25 / 5 / 15 min", "text-tomato")}
        </div>
      </Card>

      <Card padding="sm" variant="transparent">
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center">
          <kbd className="font-mono bg-surface dark:bg-surface-dark px-1.5 py-0.5 rounded border border-border dark:border-border-dark">
            {formatHotkey("CmdOrCtrl+Shift+J", platform)}
          </kbd>{" "}
          Pomodoro ·{" "}
          <kbd className="font-mono bg-surface dark:bg-surface-dark px-1.5 py-0.5 rounded border border-border dark:border-border-dark">
            {formatHotkey("CmdOrCtrl+Shift+K", platform)}
          </kbd>{" "}
          Do Not Disturb ·{" "}
          <kbd className="font-mono bg-surface dark:bg-surface-dark px-1.5 py-0.5 rounded border border-border dark:border-border-dark">
            {formatHotkey("CmdOrCtrl+Shift+H", platform)}
          </kbd>{" "}
          Dashboard
        </p>
      </Card>

      <div className="flex gap-3 pt-1">
        <Button variant="ghost" onClick={back} disabled={saving}>
          ← Back
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={finish}
          disabled={saving}
          icon={saving ? <AnimatedH size={18} loading /> : undefined}
        >
          {saving ? "Setting up…" : "Finish & start Haysu ✨"}
        </Button>
      </div>
    </div>
  );
}
