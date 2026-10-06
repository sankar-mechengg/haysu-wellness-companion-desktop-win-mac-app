import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateInfo {
  version: string;
  notes: string;
  date: string | null;
}

let pending: Update | null = null;

/** Ask GitHub for a newer release. Returns null when up to date or offline. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const update = await check({ timeout: 15_000 });
    if (!update) {
      pending = null;
      return null;
    }
    pending = update;
    return {
      version: update.version,
      notes: update.body ?? "",
      date: update.date ?? null,
    };
  } catch (e) {
    console.warn("[Haysu] update check failed:", e);
    return null;
  }
}

/**
 * Download, install and relaunch. `onProgress` receives 0..1.
 * Throws when no update was found by a previous `checkForUpdate`.
 */
export async function installUpdate(onProgress?: (fraction: number) => void): Promise<void> {
  const update = pending ?? (await check({ timeout: 15_000 }));
  if (!update) throw new Error("No update available");
  let total = 0;
  let received = 0;
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? 0;
        onProgress?.(0);
        break;
      case "Progress":
        received += event.data.chunkLength;
        if (total > 0) onProgress?.(Math.min(1, received / total));
        break;
      case "Finished":
        onProgress?.(1);
        break;
    }
  });
  await relaunch();
}
