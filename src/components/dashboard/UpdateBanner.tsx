import { useCallback, useState } from "react";
import { EVENTS, errorMessage } from "../../lib/api";
import { checkForUpdate, installUpdate } from "../../lib/updater";
import { useAppStore } from "../../store/appStore";
import { useTauriEvent } from "../../hooks/useTauriEvent";
import { toast } from "../common/Toast";

/**
 * Shows "update available" and handles the tray's "Check for Updates…" action.
 */
export default function UpdateBanner() {
  const update = useAppStore((s) => s.updateAvailable);
  const setUpdate = useAppStore((s) => s.setUpdateAvailable);
  const [progress, setProgress] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setDismissed(false);
    const u = await checkForUpdate();
    setChecking(false);
    if (u) {
      setUpdate({ version: u.version, notes: u.notes });
    } else {
      setUpdate(null);
      toast.info("You're on the latest version");
    }
  }, [setUpdate]);

  useTauriEvent(EVENTS.checkUpdates, () => void check());

  const install = async () => {
    try {
      setProgress(0);
      await installUpdate(setProgress);
    } catch (e) {
      toast.error(`Update failed: ${errorMessage(e)}`);
      setProgress(null);
    }
  };

  if (checking) {
    return (
      <div className="mb-3 text-xs text-text-secondary dark:text-text-secondary-dark">
        Checking for updates…
      </div>
    );
  }
  if (!update || dismissed) return null;

  return (
    <div className="mb-3 flex items-center gap-3 px-3 py-2 rounded-xl bg-move/10 border border-move/30 animate-pop">
      <span className="text-sm">⬆️</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">
          Haysu {update.version} is available
        </p>
        {update.notes && (
          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark truncate">
            {update.notes.split("\n")[0]}
          </p>
        )}
      </div>
      {progress === null ? (
        <>
          <button
            type="button"
            onClick={install}
            className="h-7 px-3 rounded-lg text-xs font-semibold bg-move text-white hover:opacity-90"
          >
            Install & restart
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="h-7 w-7 rounded-lg text-xs text-text-secondary hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
            title="Later"
          >
            ✕
          </button>
        </>
      ) : (
        <span className="text-xs font-medium text-move tabular-nums">
          {Math.round(progress * 100)}%
        </span>
      )}
    </div>
  );
}
