import { useCallback, useEffect, useRef, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { api, errorMessage } from "../../lib/api";
import { localDateString } from "../../lib/format";
import { toast } from "../common/Toast";

export default function ExportButton() {
  const [busy, setBusy] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpenMenu(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  const exportJson = useCallback(async () => {
    setOpenMenu(false);
    setBusy(true);
    try {
      const path = await save({
        defaultPath: `haysu_export_${localDateString()}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (path) {
        const written = await api.exportJson(path);
        toast.success(`Saved ${written}`);
      }
    } catch (e) {
      toast.error(`Export failed: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const exportCsv = useCallback(async () => {
    setOpenMenu(false);
    setBusy(true);
    try {
      const folder = await open({
        directory: true,
        multiple: false,
        title: "Choose a folder for the CSV files",
      });
      if (typeof folder === "string" && folder) {
        const files = await api.exportCsv(folder);
        toast.success(`Saved ${files.length} CSV files`);
      }
    } catch (e) {
      toast.error(`Export failed: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const item =
    "w-full px-4 py-2.5 text-left text-sm text-text-primary dark:text-text-primary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark transition-colors";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpenMenu((o) => !o)}
        disabled={busy}
        className="h-8 px-3 rounded-xl text-xs font-medium border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text-primary dark:text-text-primary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark disabled:opacity-50"
      >
        {busy ? "Exporting…" : "📤 Export"}
      </button>
      {openMenu && (
        <div className="absolute right-0 top-full mt-1 bg-surface dark:bg-surface-dark rounded-xl shadow-lg border border-border dark:border-border-dark overflow-hidden z-50 min-w-[170px] animate-pop">
          <button type="button" onClick={exportJson} className={item}>
            📋 JSON (single file)
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className={`${item} border-t border-border/50 dark:border-border-dark/50`}
          >
            📊 CSV (one per log)
          </button>
        </div>
      )}
    </div>
  );
}
