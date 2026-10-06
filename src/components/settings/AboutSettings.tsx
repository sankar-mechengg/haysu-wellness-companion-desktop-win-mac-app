import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import Card from "../common/Card";
import Button from "../common/Button";
import AnimatedH from "../common/AnimatedH";
import { SectionHeader } from "../common/Section";
import { toast } from "../common/Toast";
import { checkForUpdate, installUpdate } from "../../lib/updater";
import { RELEASES_URL, REPO_URL } from "../../lib/constants";
import { errorMessage } from "../../lib/api";
import { useAppStore } from "../../store/appStore";

export default function AboutSettings() {
  const system = useAppStore((s) => s.system);
  const update = useAppStore((s) => s.updateAvailable);
  const setUpdate = useAppStore((s) => s.setUpdateAvailable);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const check = async () => {
    setChecking(true);
    const u = await checkForUpdate();
    setChecking(false);
    if (u) {
      setUpdate({ version: u.version, notes: u.notes });
    } else {
      setUpdate(null);
      toast.info("You're on the latest version");
    }
  };

  const install = async () => {
    try {
      setProgress(0);
      await installUpdate(setProgress);
    } catch (e) {
      toast.error(errorMessage(e));
      setProgress(null);
    }
  };

  const row = "flex items-center justify-between text-xs py-1.5";
  const k = "text-text-secondary dark:text-text-secondary-dark";
  const v = "text-text-primary dark:text-text-primary-dark font-mono truncate max-w-[300px]";

  return (
    <div className="space-y-4">
      <SectionHeader title="About" />

      <Card padding="lg" className="text-center">
        <AnimatedH size={48} className="mx-auto mb-2" />
        <h4 className="text-base font-bold text-text-primary dark:text-text-primary-dark">Haysu</h4>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
          Version {system?.version ?? "…"} · {system?.platform}
        </p>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
          Your desktop wellness companion
        </p>

        <div className="flex justify-center gap-2 mt-4">
          {update ? (
            progress === null ? (
              <Button size="sm" variant="move" onClick={install}>
                Install {update.version} & restart
              </Button>
            ) : (
              <span className="text-xs text-move font-medium self-center">
                {Math.round(progress * 100)}%
              </span>
            )
          ) : (
            <Button size="sm" variant="secondary" onClick={check} disabled={checking}>
              {checking ? "Checking…" : "Check for updates"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => openUrl(RELEASES_URL)}>
            Release notes
          </Button>
          <Button size="sm" variant="ghost" onClick={() => openUrl(REPO_URL)}>
            GitHub
          </Button>
        </div>
      </Card>

      <Card padding="md">
        <div className={row}>
          <span className={k}>Data folder</span>
          <span className={v} title={system?.data_dir ?? ""}>
            {system?.data_dir ?? "—"}
          </span>
        </div>
        <div className={row}>
          <span className={k}>Log folder</span>
          <span className={v} title={system?.log_dir ?? ""}>
            {system?.log_dir ?? "—"}
          </span>
        </div>
        <div className={row}>
          <span className={k}>Built with</span>
          <span className={v}>Tauri 2 · Rust · React · Tailwind</span>
        </div>
        <div className={row}>
          <span className={k}>License</span>
          <span className={v}>MIT</span>
        </div>
      </Card>
    </div>
  );
}
