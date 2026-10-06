import { useCallback } from "react";
import { api, errorMessage, type ConfigPatch } from "../lib/api";
import { useAppStore } from "../store/appStore";
import { toast } from "../components/common/Toast";

/** Apply a partial config change; the store updates from the result immediately. */
export function useConfigPatch() {
  const setConfig = useAppStore((s) => s.setConfig);
  const setHotkeyErrors = useAppStore((s) => s.setHotkeyErrors);

  return useCallback(
    async (patch: ConfigPatch, successMessage?: string) => {
      try {
        const result = await api.updateConfig(patch);
        setConfig(result.config);
        setHotkeyErrors(result.hotkey_errors);
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (e) {
        toast.error(`Could not save: ${errorMessage(e)}`);
        return null;
      }
    },
    [setConfig, setHotkeyErrors]
  );
}
