import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";
import { api, errorMessage } from "../../lib/api";
import { formatClock, formatDurationShort } from "../../lib/format";
import { slotTime } from "../../lib/health";
import { checkForUpdate, installUpdate } from "../../lib/updater";
import { useAppStore, useConfig, useLive } from "../../store/appStore";
import AnimatedH from "../common/AnimatedH";

const WIDTH = 260;
const COMPACT_H = 56;
const EXPANDED_H = 196;
const EXPANDED_WITH_DOSE_H = 224;

export default function FloatingWidget() {
  const live = useLive();
  const config = useConfig();
  const updateAvailable = useAppStore((s) => s.updateAvailable);
  const setUpdateAvailable = useAppStore((s) => s.setUpdateAvailable);
  const [expanded, setExpanded] = useState(false);
  const [installing, setInstalling] = useState<number | null>(null);

  const dose = live?.next_dose ?? null;
  const hasDose = dose !== null;

  // Resize the native window with the content.
  useEffect(() => {
    const h = expanded ? (hasDose ? EXPANDED_WITH_DOSE_H : EXPANDED_H) : COMPACT_H;
    getCurrentWindow()
      .setSize(new LogicalSize(WIDTH, h))
      .catch(() => {});
  }, [expanded, hasDose]);

  // Silent update check shortly after launch.
  useEffect(() => {
    if (!config?.check_updates_on_launch) return;
    const t = setTimeout(() => {
      checkForUpdate().then((u) => u && setUpdateAvailable({ version: u.version, notes: u.notes }));
    }, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.check_updates_on_launch]);

  const onInstall = useCallback(async () => {
    if (!updateAvailable) return;
    const yes = await ask(
      `Haysu ${updateAvailable.version} is available. Download and install now? Haysu will restart.`,
      { title: "Update Haysu", kind: "info", okLabel: "Install", cancelLabel: "Later" }
    );
    if (!yes) return;
    try {
      setInstalling(0);
      await installUpdate((f) => setInstalling(f));
    } catch (e) {
      console.error(errorMessage(e));
      setInstalling(null);
    }
  }, [updateAvailable]);

  if (!live || !config) return null;

  const dnd = live.dnd.enabled;
  const paused = live.paused_reason;
  const pomo = live.pomodoro;

  // Primary line.
  let primary: string;
  let accent = "text-text-primary dark:text-text-primary-dark";
  if (dose?.overdue) {
    primary = `💊 ${dose.name} due`;
    accent = "text-pill";
  } else if (pomo.running) {
    const label =
      pomo.phase === "work" ? "Focus" : pomo.phase === "long_break" ? "Long break" : "Break";
    primary = `${pomo.paused ? "⏸" : "🍅"} ${label} ${formatClock(pomo.remaining_secs)}`;
    accent = "text-tomato";
  } else if (dnd) {
    primary = live.dnd.until
      ? `🔕 DND until ${new Date(live.dnd.until).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
      : "🔕 Do Not Disturb";
    accent = "text-text-secondary dark:text-text-secondary-dark";
  } else if (paused === "schedule") {
    primary = "🌙 Outside work hours";
    accent = "text-text-secondary dark:text-text-secondary-dark";
  } else if (paused === "idle") {
    primary = "💤 Paused while away";
    accent = "text-text-secondary dark:text-text-secondary-dark";
  } else if (live.water.remaining_secs <= live.movement.remaining_secs) {
    primary = `💧 Water in ${formatDurationShort(live.water.remaining_secs)}`;
  } else {
    primary = `🏃 Move in ${formatDurationShort(live.movement.remaining_secs)}`;
  }

  const row = "flex items-center justify-between text-xs";
  const muted = "text-text-secondary dark:text-text-secondary-dark";
  const iconBtn =
    "w-7 h-7 inline-flex items-center justify-center rounded-lg text-xs hover:bg-surface-hover dark:hover:bg-surface-hover-dark transition-colors focus:outline-none";
  const chip = (cls: string) =>
    `px-1.5 h-5 rounded-md text-[10px] font-semibold transition-colors ${cls}`;

  return (
    <div className="h-screen w-screen flex items-start justify-center p-1">
      <div
        className={`w-full rounded-2xl border backdrop-blur-xl select-none overflow-hidden transition-colors
          bg-white/90 dark:bg-surface-dark/90
          ${dnd ? "border-border/60 dark:border-border-dark/60" : "border-haysu-200/70 dark:border-haysu-500/30"}`}
        style={{
          boxShadow: dnd
            ? "0 4px 14px rgba(0,0,0,0.10)"
            : "0 6px 18px rgba(59,147,247,0.16), 0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* Compact bar */}
        <div className="h-12 flex items-center gap-1.5 pl-1.5 pr-1.5">
          <div
            data-tauri-drag-region
            className={`h-8 w-4 flex items-center justify-center rounded-md ${muted} text-[10px] tracking-tighter`}
            title="Drag to move"
          >
            ⋮⋮
          </div>
          <AnimatedH
            size={22}
            loading={pomo.running && !pomo.paused}
            color={dnd ? "#9ca3af" : "#3b93f7"}
          />
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className={`flex-1 text-left text-xs font-semibold truncate ${accent} focus:outline-none`}
            title={expanded ? "Collapse" : "Expand"}
          >
            {primary}
          </button>

          {updateAvailable && (
            <button
              type="button"
              onClick={onInstall}
              className={chip("bg-move/15 text-move hover:bg-move/25 h-6")}
              title={`Update to ${updateAvailable.version}`}
            >
              {installing === null ? "⬆ Update" : `${Math.round(installing * 100)}%`}
            </button>
          )}

          <button
            type="button"
            onClick={() => api.pomodoro("toggle")}
            className={`${iconBtn} ${pomo.running ? "text-tomato" : muted}`}
            title={
              pomo.running ? (pomo.paused ? "Resume Pomodoro" : "Pause Pomodoro") : "Start Pomodoro"
            }
          >
            {pomo.running && !pomo.paused ? "⏸" : "▶"}
          </button>
        </div>

        {/* Expanded panel */}
        {expanded && (
          <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50 dark:border-border-dark/50 animate-fade-in">
            {dose && (
              <div className={row}>
                <span className={muted}>💊 {dose.name}</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono font-medium tabular-nums ${dose.overdue ? "text-pill" : muted}`}
                  >
                    {dose.overdue ? "due" : slotTime(dose.scheduled_at)}
                  </span>
                  {dose.overdue && (
                    <button
                      type="button"
                      className={chip("bg-pill/15 text-pill hover:bg-pill/25")}
                      onClick={() => api.logDose(dose.medicine_id, dose.scheduled_at, "taken")}
                      title="Mark as taken"
                    >
                      Taken
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className={row}>
              <span className={muted}>💧 Water</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-water tabular-nums">
                  {formatClock(live.water.remaining_secs)}
                </span>
                <button
                  type="button"
                  className={chip("bg-water/15 text-water hover:bg-water/25")}
                  onClick={() => api.logWater(true, config.water_amount_ml)}
                  title={`Log ${config.water_amount_ml} ml`}
                >
                  +{config.water_amount_ml}
                </button>
              </div>
            </div>
            <div className={row}>
              <span className={muted}>🏃 Move</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-move tabular-nums">
                  {formatClock(live.movement.remaining_secs)}
                </span>
                <button
                  type="button"
                  className={chip("bg-move/15 text-move hover:bg-move/25")}
                  onClick={() => api.resetReminder("movement")}
                  title="Restart countdown"
                >
                  ↻
                </button>
              </div>
            </div>
            <div className={row}>
              <span className={muted}>🍅 Pomodoro</span>
              <div className="flex items-center gap-1.5">
                {pomo.running ? (
                  <>
                    <span className="font-mono font-medium text-tomato tabular-nums">
                      {formatClock(pomo.remaining_secs)}
                    </span>
                    <button
                      type="button"
                      className={chip("bg-tomato/15 text-tomato hover:bg-tomato/25")}
                      onClick={() => api.pomodoro("skip")}
                      title="Skip phase"
                    >
                      ⏭
                    </button>
                    <button
                      type="button"
                      className={chip("bg-tomato/15 text-tomato hover:bg-tomato/25")}
                      onClick={() => api.pomodoro("stop")}
                      title="Stop"
                    >
                      ■
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={chip("bg-tomato/15 text-tomato hover:bg-tomato/25 px-2")}
                    onClick={() => api.pomodoro("start")}
                  >
                    Start {pomo.queued !== "work" ? "break" : "focus"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 pt-1">
              <button
                type="button"
                onClick={() => api.toggleDnd()}
                className={`flex-1 h-7 rounded-lg text-[11px] font-medium transition-colors ${
                  dnd
                    ? "bg-haysu-500 text-white"
                    : "bg-surface-hover dark:bg-surface-hover-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark"
                }`}
              >
                {dnd ? "DND on" : "DND"}
              </button>
              <button
                type="button"
                onClick={() => api.showWindow("dashboard")}
                className="flex-1 h-7 rounded-lg text-[11px] font-medium bg-surface-hover dark:bg-surface-hover-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => api.showWindow("settings")}
                className="flex-1 h-7 rounded-lg text-[11px] font-medium bg-surface-hover dark:bg-surface-hover-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark"
              >
                Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
