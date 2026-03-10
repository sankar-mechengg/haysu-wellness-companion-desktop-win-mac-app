import { useState, useEffect, useCallback, ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "../../assets/animations/loading.css";

interface PopupContainerProps {
  children: ReactNode;
  onDismiss: () => void;
  colorAccent?: string;
  soundEnabled?: boolean;
}

export default function PopupContainer({
  children,
  onDismiss,
  colorAccent = "#3b93f7",
  soundEnabled = true,
}: PopupContainerProps) {
  const [animState, setAnimState] = useState<"entering" | "visible" | "exiting">("entering");

  useEffect(() => {
    // Show the window
    const appWindow = getCurrentWindow();
    appWindow.show().catch(() => {});
    appWindow.setFocus().catch(() => {});

    // Play subtle chime
    if (soundEnabled) {
      playChime();
    }

    // Enter animation complete
    const enterTimer = setTimeout(() => setAnimState("visible"), 400);
    return () => clearTimeout(enterTimer);
  }, [soundEnabled]);

  const handleDismiss = useCallback(() => {
    setAnimState("exiting");
    setTimeout(() => {
      const appWindow = getCurrentWindow();
      appWindow.hide().catch(() => {});
      onDismiss();
    }, 300);
  }, [onDismiss]);

  const animClass =
    animState === "entering"
      ? "haysu-slide-down"
      : animState === "exiting"
      ? "haysu-slide-up"
      : "";

  return (
    <div
      className="h-screen w-screen flex justify-center pt-2 bg-transparent"
      data-tauri-drag-region
    >
      <div
        className={`
          bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl
          rounded-2xl shadow-2xl
          border border-white/20 dark:border-border-dark
          max-w-sm w-full mx-4
          overflow-hidden
          ${animClass}
        `}
        style={{
          boxShadow: `0 8px 32px -4px ${colorAccent}30, 0 4px 16px -2px rgba(0,0,0,0.1)`,
        }}
      >
        {/* Colored accent bar at top */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${colorAccent}, ${colorAccent}88)` }}
        />

        {/* Content */}
        <div className="p-5">
          {children}
        </div>

        {/* Dismiss hint */}
        <button
          onClick={handleDismiss}
          className="w-full py-2.5 text-xs text-text-secondary dark:text-text-secondary-dark
            hover:bg-surface-hover dark:hover:bg-surface-hover-dark
            transition-colors border-t border-border/50 dark:border-border-dark/50
            focus:outline-none"
        >
          Click to dismiss
        </button>
      </div>
    </div>
  );
}

/** Play a subtle notification chime using Web Audio API */
function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08); // C#6
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.16); // E6

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);

    // Cleanup
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio not available — silent fallback
  }
}
