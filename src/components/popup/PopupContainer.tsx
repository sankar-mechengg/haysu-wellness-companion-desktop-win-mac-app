import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useConfig } from "../../store/appStore";

export interface PopupAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
  /** Keyboard key that triggers the action, e.g. "Enter", "Escape", "s". */
  hotkey?: string;
  title?: string;
}

interface PopupContainerProps {
  children: ReactNode;
  accent: string;
  /** Called after the exit animation; the host then shows the next reminder or hides. */
  onDone: () => void;
  /** Called when the auto-dismiss timer elapses without any user action. */
  onTimeout?: () => void;
  actions: PopupAction[];
  /** Pause the auto-dismiss timer (e.g. while an exercise countdown runs). */
  holdTimer?: boolean;
}

export default function PopupContainer({
  children,
  accent,
  onDone,
  onTimeout,
  actions,
  holdTimer = false,
}: PopupContainerProps) {
  const config = useConfig();
  const autoDismissSec = config?.popup_auto_dismiss_sec ?? 0;
  const soundEnabled = config?.sound_enabled ?? true;
  const [anim, setAnim] = useState<"in" | "steady" | "out">("in");
  const [remaining, setRemaining] = useState(autoDismissSec);
  const closedRef = useRef(false);

  // Entrance + chime.
  useEffect(() => {
    if (soundEnabled) playChime();
    const t = setTimeout(() => setAnim("steady"), 350);
    return () => clearTimeout(t);
  }, [soundEnabled]);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setAnim("out");
    setTimeout(onDone, 230);
  }, [onDone]);

  // Auto-dismiss countdown.
  useEffect(() => {
    if (!autoDismissSec || holdTimer) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          onTimeout?.();
          close();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [autoDismissSec, holdTimer, close, onTimeout]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = actions.find((x) => x.hotkey && x.hotkey.toLowerCase() === e.key.toLowerCase());
      if (a) {
        e.preventDefault();
        a.onClick();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions]);

  const animClass = anim === "in" ? "animate-slide-down" : anim === "out" ? "animate-slide-up" : "";
  const progress = autoDismissSec ? (remaining / autoDismissSec) * 100 : 0;

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-white/40 dark:border-border-dark backdrop-blur-xl bg-white/95 dark:bg-surface-dark/95 ${animClass}`}
      style={{ boxShadow: `0 10px 36px -6px ${accent}55, 0 4px 16px -2px rgba(0,0,0,0.14)` }}
    >
      {/* Accent / auto-dismiss bar */}
      <div className="h-1 w-full bg-border/40 dark:bg-border-dark/40" data-tauri-drag-region>
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{
            width: autoDismissSec && !holdTimer ? `${progress}%` : "100%",
            background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
          }}
        />
      </div>

      <div className="p-4" data-tauri-drag-region>
        {children}
      </div>

      <div className="flex gap-2 px-4 pb-4">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            title={a.title ?? (a.hotkey ? `Shortcut: ${a.hotkey}` : undefined)}
            className={`h-9 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-haysu-300 ${
              a.variant === "ghost"
                ? "px-3 text-text-secondary dark:text-text-secondary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                : "flex-1 px-4 text-white hover:opacity-90 active:opacity-80"
            }`}
            style={a.variant === "ghost" ? undefined : { backgroundColor: accent }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Three-note chime via Web Audio. */
function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 600);
  } catch {
    // No audio device — fine.
  }
}
