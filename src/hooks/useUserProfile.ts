import { useState, useEffect, useCallback } from "react";
import { api, UserProfile } from "../lib/tauriApi";
import { useAppStore } from "../store/appStore";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const setUserInfo = useAppStore((s) => s.setUserInfo);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const p = await api.getUserProfile();
      setProfile(p);
      if (p) {
        setUserInfo(p.name, p.work_style, p.daily_water_ml);
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    } finally {
      setLoading(false);
    }
  }, [setUserInfo]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = useCallback(
    async (data: {
      name: string;
      age: number;
      weight_kg: number;
      height_cm: number;
      occupation: string;
      work_style: string;
    }) => {
      try {
        const saved = await api.saveUserProfile(data);
        setProfile(saved);
        setUserInfo(saved.name, saved.work_style, saved.daily_water_ml);
        return saved;
      } catch (e) {
        console.error("Failed to save profile:", e);
        throw e;
      }
    },
    [setUserInfo]
  );

  const updateProfile = useCallback(
    async (data: {
      name: string;
      age: number;
      weight_kg: number;
      height_cm: number;
      occupation: string;
      work_style: string;
    }) => {
      try {
        const updated = await api.updateUserProfile(data);
        setProfile(updated);
        setUserInfo(updated.name, updated.work_style, updated.daily_water_ml);
        return updated;
      } catch (e) {
        console.error("Failed to update profile:", e);
        throw e;
      }
    },
    [setUserInfo]
  );

  return { profile, loading, loadProfile, saveProfile, updateProfile };
}
