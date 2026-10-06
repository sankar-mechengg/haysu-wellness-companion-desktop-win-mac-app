import { useCallback, useEffect, useState } from "react";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import Card from "../common/Card";
import Toggle from "../common/Toggle";
import Button from "../common/Button";
import Slider from "../common/Slider";
import { Rows, SectionHeader } from "../common/Section";
import { toast } from "../common/Toast";
import { useConfigPatch } from "../../hooks/useConfigPatch";
import { api, errorMessage, type ArchivePreview, type ImportReport } from "../../lib/api";
import { localDateString } from "../../lib/format";
import { useConfig } from "../../store/appStore";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ImportDialog({
  path,
  onClose,
}: {
  path: string;
  onClose: (report: ImportReport | null) => void;
}) {
  const [preview, setPreview] = useState<ArchivePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .backupPreview(path)
      .then(setPreview)
      .catch((e) => setError(errorMessage(e)));
  }, [path]);

  const run = async (replace: boolean) => {
    if (replace) {
      const ok = await ask(
        "Replace everything in Haysu with this file? Your current records will be deleted first. A backup is written before importing.",
        { title: "Replace all data", kind: "warning", okLabel: "Replace" }
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const report = await api.backupImport(path, replace);
      toast.success("Import complete");
      onClose(report);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const name = path.split(/[\\/]/).pop();
  const isSnapshot = preview?.format === "haysu-snapshot";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <Card padding="md" className="w-[420px] max-w-[92vw] space-y-3 animate-pop">
        <div>
          <h3 className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
            Import {isSnapshot ? "snapshot" : "backup"}
          </h3>
          <p
            className="text-xs text-text-secondary dark:text-text-secondary-dark truncate"
            title={path}
          >
            {name}
          </p>
        </div>
        {error ? (
          <p className="text-xs text-tomato">{error}</p>
        ) : !preview ? (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Reading…</p>
        ) : (
          <>
            <div className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Created {new Date(preview.created_at).toLocaleString()} by Haysu {preview.app_version}
              {preview.exported_by && ` · ${preview.exported_by}`}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {preview.has_profile && (
                <li className="text-text-primary dark:text-text-primary-dark">👤 Profile</li>
              )}
              {preview.counts
                .filter(([, n]) => n > 0)
                .map(([k, n]) => (
                  <li key={k} className="text-text-primary dark:text-text-primary-dark">
                    <span className="tabular-nums font-medium">{n}</span>{" "}
                    <span className="text-text-secondary dark:text-text-secondary-dark">{k}</span>
                  </li>
                ))}
            </ul>
            <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
              <b>Merge</b> adds anything missing and keeps your current records. <b>Replace</b>{" "}
              wipes Haysu first and restores exactly this file.
            </p>
          </>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => onClose(null)} disabled={busy}>
            Cancel
          </Button>
          {preview && !error && (
            <>
              <Button variant="secondary" size="sm" onClick={() => run(true)} disabled={busy}>
                Replace all
              </Button>
              <Button size="sm" onClick={() => run(false)} disabled={busy}>
                {busy ? "Importing…" : "Merge"}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function BackupSettings() {
  const config = useConfig();
  const patch = useConfigPatch();
  const [backups, setBackups] = useState<[string, number][]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [importPath, setImportPath] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  const refresh = useCallback(() => {
    api
      .backupList()
      .then(setBackups)
      .catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);

  if (!config) return null;

  const exportHay = async (includeAi: boolean) => {
    const path = await save({
      title: "Export Haysu backup",
      defaultPath: `haysu-${localDateString()}.hay`,
      filters: [{ name: "Haysu backup", extensions: ["hay"] }],
    });
    if (!path) return;
    setBusy("hay");
    try {
      await api.backupExportHay(path, includeAi);
      toast.success("Backup saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const exportSu = async () => {
    const path = await save({
      title: "Export health snapshot",
      defaultPath: `haysu-health-${localDateString()}.su`,
      filters: [{ name: "Haysu health snapshot", extensions: ["su"] }],
    });
    if (!path) return;
    setBusy("su");
    try {
      await api.backupExportSu(path);
      toast.success("Snapshot saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const pickImport = async () => {
    const path = await open({
      title: "Import a Haysu file",
      multiple: false,
      directory: false,
      filters: [
        { name: "Haysu files", extensions: ["hay", "su"] },
        { name: "Haysu backup", extensions: ["hay"] },
        { name: "Haysu health snapshot", extensions: ["su"] },
      ],
    });
    if (typeof path === "string") setImportPath(path);
  };

  const saveReport = async () => {
    const path = await save({
      title: "Save health report",
      defaultPath: `haysu-health-report-${localDateString()}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!path) return;
    setBusy("report");
    try {
      await api.backupSaveReport(path);
      toast.success("Report saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const backupNow = async () => {
    setBusy("now");
    try {
      await api.backupNow();
      toast.success("Backup written");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Backup & export"
        description="Two file types: .hay holds everything, .su is a health-only snapshot you can hand to a clinician or another device."
      />

      <Card padding="md" className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/60 dark:border-border-dark/60 p-3">
            <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              📦 .hay backup
            </p>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5 mb-2">
              Profile, settings, every log, medicines, diary, care routines and AI chats. API keys
              are never included.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => exportHay(true)} disabled={busy !== null}>
                {busy === "hay" ? "Saving…" : "Export .hay"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportHay(false)}
                disabled={busy !== null}
              >
                Without AI chats
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-border/60 dark:border-border-dark/60 p-3">
            <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              🩺 .su health snapshot
            </p>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5 mb-2">
              Profile, conditions, medicines and adherence, diary, measurements and food. No
              settings or chats.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={exportSu} disabled={busy !== null}>
                {busy === "su" ? "Saving…" : "Export .su"}
              </Button>
              <Button size="sm" variant="secondary" onClick={saveReport} disabled={busy !== null}>
                {busy === "report" ? "Saving…" : "Doctor report (.md)"}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" variant="secondary" onClick={pickImport} disabled={busy !== null}>
            Import a .hay or .su file…
          </Button>
          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
            Double-clicking a Haysu file also opens this.
          </p>
        </div>
      </Card>

      <Card padding="md">
        <Rows>
          <Toggle
            label="Automatic daily backup"
            description={`A .hay file is written to Haysu's data folder once a day. ${config.auto_backup ? `Keeps the latest ${config.auto_backup_keep}.` : ""}`}
            checked={config.auto_backup}
            onChange={(v) => patch({ auto_backup: v })}
          />
          {config.auto_backup && (
            <Slider
              label="Backups to keep"
              value={config.auto_backup_keep}
              onChange={(v) => patch({ auto_backup_keep: v })}
              min={1}
              max={60}
              unit=""
            />
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                Stored backups
              </p>
              {backups.length === 0 ? (
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  None yet
                </p>
              ) : (
                <ul className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1 space-y-0.5 max-h-28 overflow-y-auto">
                  {backups.map(([p, size]) => (
                    <li key={p} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setImportPath(p)}
                        className="font-mono truncate hover:text-haysu-500"
                        title="Restore from this backup"
                      >
                        {p.split(/[\\/]/).pop()}
                      </button>
                      <span className="tabular-nums flex-shrink-0">{fmtBytes(size)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <Button size="sm" variant="secondary" onClick={backupNow} disabled={busy !== null}>
                {busy === "now" ? "…" : "Back up now"}
              </Button>
              {backups.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => revealItemInDir(backups[0][0]).catch(() => {})}
                >
                  Show folder
                </Button>
              )}
            </div>
          </div>
        </Rows>
      </Card>

      {importPath && (
        <ImportDialog
          path={importPath}
          onClose={(r) => {
            setImportPath(null);
            if (r) {
              setReport(r);
              refresh();
            }
          }}
        />
      )}
      {report && (
        <Card padding="md" variant="move" className="animate-pop">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                Imported
              </p>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                {[
                  report.profile && "profile",
                  report.settings && `${report.settings} settings`,
                  report.water && `${report.water} water`,
                  report.movement && `${report.movement} movement`,
                  report.pomodoro && `${report.pomodoro} focus`,
                  report.medicines && `${report.medicines} medicines`,
                  report.doses && `${report.doses} doses`,
                  report.conditions && `${report.conditions} conditions`,
                  report.diary && `${report.diary} diary`,
                  report.measurements && `${report.measurements} measurements`,
                  report.food && `${report.food} meals`,
                  report.care_routines && `${report.care_routines} routines`,
                  report.skipped && `${report.skipped} skipped (already present)`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "nothing new (everything was already here)"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReport(null)}
              className="text-xs text-text-secondary"
            >
              ✕
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
