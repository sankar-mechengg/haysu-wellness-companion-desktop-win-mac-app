import { useCallback, useEffect, useRef, useState } from "react";
import {
  currentMonitor,
  getCurrentWindow,
  LogicalSize,
  PhysicalPosition,
} from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";
import { api, EVENTS, errorMessage } from "../../lib/api";
import { formatClock, formatDurationShort } from "../../lib/format";
import { slotTime } from "../../lib/health";
import { checkForUpdate, installUpdate } from "../../lib/updater";
import { useTauriEvent } from "../../hooks/useTauriEvent";
import { useAppStore, useConfig, useLive } from "../../store/appStore";
import AnimatedH from "../common/AnimatedH";

const WIDTH = 260;
const COMPACT_H = 56;
const EXPANDED_H = 196;
const EXPANDED_WITH_DOSE_H = 224;
/** Size of the half-pill tab the widget shrinks to while docked and idle. */
const TAB_W = 72;
const TAB_H = 30;
/** Within this many physical pixels of the top edge the widget snaps and docks. */
const DOCK_SNAP_PX = 28;
/** Docked widget drops behind other windows after this long without attention. */
const DORMANT_MS = 5000;
const BAR_X_KEY = "haysu.widget.barX";

export default function FloatingWidget() {
  const live = useLive();
  const config = useConfig();
  const updateAvailable = useAppStore((s) => s.updateAvailable);
  const setUpdateAvailable = useAppStore((s) => s.setUpdateAvailable);
  const [expanded, setExpanded] = useState(false);
  const [installing, setInstalling] = useState<number | null>(null);
  const [docked, setDocked] = useState(false);
  const [hover, setHover] = useState(false);
  /** Physical x of the full bar while docked; the tab is centred on it. */
  const barX = useRef<number | null>(null);
  /** True while we move/resize the window ourselves (ignore those Moved events). */
  const programmatic = useRef(false);
  const alwaysOnTop = config?.widget_always_on_top ?? true;

  const dose = live?.next_dose ?? null;
  const hasDose = dose !== null;
  // Docked and idle: only the tab is visible (and the window is tab-sized).
  const tucked = docked && !hover && !expanded;

  const scaleOf = async () => {
    try {
      return await getCurrentWindow().scaleFactor();
    } catch {
      return window.devicePixelRatio || 1;
    }
  };

  const tabOffset = (scale: number) => Math.round(((WIDTH - TAB_W) / 2) * scale);

  // Dock detection: when the window sits against the top of its monitor it
  // becomes a half-pill tab; dragging it down again undocks it.
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | null = null;
    let timer: number | null = null;
    const check = async (fromMove: boolean) => {
      if (programmatic.current) return;
      try {
        const [pos, mon, scale] = await Promise.all([
          win.outerPosition(),
          currentMonitor(),
          scaleOf(),
        ]);
        if (!mon) return;
        const top = mon.position.y;
        const dy = pos.y - top;
        const nowDocked = dy > -DOCK_SNAP_PX && dy <= DOCK_SNAP_PX;
        if (nowDocked) {
          // Work out where the full bar lives from wherever the window is now.
          const size = await win.outerSize();
          const isTabSized = size.width < (WIDTH * scale) / 2;
          let bx: number;
          if (!fromMove) {
            // Startup: the saved position may be the tab's or the bar's.
            const stored = Number(localStorage.getItem(BAR_X_KEY));
            const tabFromStored = stored + tabOffset(scale);
            bx =
              Number.isFinite(stored) && stored !== 0 && Math.abs(pos.x - tabFromStored) < 6
                ? stored
                : isTabSized
                  ? pos.x - tabOffset(scale)
                  : pos.x;
          } else {
            bx = isTabSized ? pos.x - tabOffset(scale) : pos.x;
          }
          barX.current = bx;
          try {
            localStorage.setItem(BAR_X_KEY, String(bx));
          } catch {
            /* storage blocked */
          }
          if (dy !== 0) {
            programmatic.current = true;
            await win.setPosition(new PhysicalPosition(pos.x, top));
            programmatic.current = false;
          }
          setDocked(true);
        } else {
          setDocked(false);
        }
      } catch {
        /* window gone */
      }
    };
    check(false);
    win
      .onMoved(() => {
        if (programmatic.current) return;
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => check(true), 180);
      })
      .then((u) => (unlisten = u))
      .catch(() => {});
    return () => {
      if (timer) window.clearTimeout(timer);
      unlisten?.();
    };
  }, []);

  // Size (and, while docked, position) the native window to match the state:
  // tab-sized when tucked, otherwise the bar or the expanded panel.
  useEffect(() => {
    const win = getCurrentWindow();
    let cancelled = false;
    (async () => {
      const scale = await scaleOf();
      programmatic.current = true;
      try {
        if (tucked) {
          const pos = await win.outerPosition();
          if (barX.current == null) barX.current = pos.x;
          await win.setSize(new LogicalSize(TAB_W, TAB_H));
          await win.setPosition(new PhysicalPosition(barX.current + tabOffset(scale), pos.y));
        } else {
          const h = expanded ? (hasDose ? EXPANDED_WITH_DOSE_H : EXPANDED_H) : COMPACT_H;
          if (docked && barX.current != null) {
            const pos = await win.outerPosition();
            await win.setPosition(new PhysicalPosition(barX.current, pos.y));
          }
          await win.setSize(new LogicalSize(WIDTH, h));
        }
      } catch {
        /* window gone */
      } finally {
        // Let the Moved events from our own calls drain before listening again.
        window.setTimeout(() => {
          if (!cancelled) programmatic.current = false;
        }, 250);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tucked, expanded, hasDose, docked]);

  // Stay in front while being used; a docked, idle widget drops behind other
  // windows after a few seconds. Undocked, the preference applies as before.
  useEffect(() => {
    const win = getCurrentWindow();
    if (!docked) {
      win.setAlwaysOnTop(alwaysOnTop).catch(() => {});
      return;
    }
    if (hover || expanded) {
      win.setAlwaysOnTop(true).catch(() => {});
      return;
    }
    const t = window.setTimeout(() => {
      win.setAlwaysOnTop(false).catch(() => {});
    }, DORMANT_MS);
    return () => window.clearTimeout(t);
  }, [docked, hover, expanded, alwaysOnTop]);

  // Clicking anywhere outside (the window loses focus) closes the panel and
  // tucks the widget away.
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | null = null;
    win
      .onFocusChanged(({ payload: focused }) => {
        if (!focused) {
          setExpanded(false);
          setHover(false);
        }
      })
      .then((u) => (unlisten = u))
      .catch(() => {});
    return () => unlisten?.();
  }, []);

  // A main window opening (dashboard, settings, onboarding) tucks the widget.
  useTauriEvent<string>(EVENTS.windowShown, () => {
    setExpanded(false);
    setHover(false);
  });

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
  const attention = dose?.overdue || (pomo.running && !pomo.paused);
  const border = dnd
    ? "border-border/60 dark:border-border-dark/60"
    : "border-haysu-200/70 dark:border-haysu-500/30";

  // While tucked the whole window *is* the tab, so hovering the H is the only
  // way in. The bar gets its own leave handler so moving off it tucks again.
  if (tucked) {
    return (
      <div className="h-screen w-screen flex items-start justify-center">
        <div
          data-tauri-drag-region
          onMouseEnter={() => setHover(true)}
          className={`h-7 w-[72px] rounded-b-full border border-t-0 flex items-end justify-center pb-1 cursor-pointer select-none animate-pop
            bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl ${border}`}
          style={{ boxShadow: "0 6px 16px rgba(59,147,247,0.18), 0 2px 6px rgba(0,0,0,0.10)" }}
          title={primary}
        >
          <AnimatedH
            size={16}
            loading={pomo.running && !pomo.paused}
            color={dnd ? "#9ca3af" : attention ? "#ff7b7b" : "#3b93f7"}
          />
          {attention && (
            <span className="absolute right-2 top-1 w-2 h-2 rounded-full bg-tomato animate-pulse-soft" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen flex items-start justify-center p-1"
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={`w-full rounded-2xl border backdrop-blur-xl select-none overflow-hidden animate-fade-in
          bg-white/90 dark:bg-surface-dark/90
          ${docked ? "rounded-t-none border-t-0" : ""} ${border}`}
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
            title={docked ? "Drag down to undock" : "Drag to move · drop at the top edge to dock"}
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
                onClick={() => api.openAssistant()}
                className="flex-1 h-7 rounded-lg text-[11px] font-medium bg-haysu-500/15 text-haysu-500 hover:bg-haysu-500/25"
                title="Ask Haysu AI"
              >
                ✨ Ask
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
