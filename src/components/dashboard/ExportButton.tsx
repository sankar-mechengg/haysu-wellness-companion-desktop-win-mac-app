import { useState, useCallback } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import Button from "../common/Button";
import { api } from "../../lib/tauriApi";

export default function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExportJson = useCallback(async () => {
    setShowMenu(false);
    setExporting(true);
    try {
      const filePath = await save({
        defaultPath: `haysu_export_${new Date().toISOString().split("T")[0]}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (filePath) {
        await api.exportJson(filePath);
      }
    } catch (e) {
      console.error("JSON export failed:", e);
    } finally {
      setExporting(false);
    }
  }, []);

  const handleExportCsv = useCallback(async () => {
    setShowMenu(false);
    setExporting(true);
    try {
      const folderPath = await save({
        defaultPath: `haysu_export_${new Date().toISOString().split("T")[0]}`,
        filters: [{ name: "Folder", extensions: [""] }],
      });
      if (folderPath) {
        // Use the directory of the selected path
        const dir = folderPath.substring(0, folderPath.lastIndexOf("/")) || folderPath.substring(0, folderPath.lastIndexOf("\\"));
        await api.exportCsv(dir || folderPath);
      }
    } catch (e) {
      console.error("CSV export failed:", e);
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
      >
        {exporting ? "Exporting..." : "📤 Export"}
      </Button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-surface dark:bg-surface-dark rounded-xl shadow-lg border border-border dark:border-border-dark overflow-hidden z-50 min-w-[140px] animate-fade-in">
          <button
            onClick={handleExportJson}
            className="w-full px-4 py-2.5 text-left text-sm text-text-primary dark:text-text-primary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark transition-colors"
          >
            📋 Export as JSON
          </button>
          <button
            onClick={handleExportCsv}
            className="w-full px-4 py-2.5 text-left text-sm text-text-primary dark:text-text-primary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark transition-colors border-t border-border/50 dark:border-border-dark/50"
          >
            📊 Export as CSV
          </button>
        </div>
      )}

      {/* Click outside to close */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
