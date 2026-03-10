import { useEffect } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useTheme } from "../hooks/useTheme";
import { useUserProfile } from "../hooks/useUserProfile";

export default function DashboardWindow() {
  const { initTheme } = useTheme();
  const { loadProfile } = useUserProfile();

  useEffect(() => {
    initTheme();
    loadProfile();
  }, [initTheme, loadProfile]);

  return <DashboardLayout />;
}
