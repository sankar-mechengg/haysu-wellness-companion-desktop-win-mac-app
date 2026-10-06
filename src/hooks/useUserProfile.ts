import { useCallback, useState } from "react";
import { api, errorMessage, type ProfileInput } from "../lib/api";
import { useAppStore } from "../store/appStore";

/** Profile from the store plus a save helper with error state. */
export function useUserProfile() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (input: ProfileInput) => {
      setSaving(true);
      setError(null);
      try {
        const saved = await api.saveUserProfile(input);
        setProfile(saved);
        return saved;
      } catch (e) {
        const msg = errorMessage(e);
        setError(msg);
        throw new Error(msg);
      } finally {
        setSaving(false);
      }
    },
    [setProfile]
  );

  return { profile, save, saving, error };
}
