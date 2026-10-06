import DashboardLayout from "../components/dashboard/DashboardLayout";
import { Toaster } from "../components/common/Toast";
import { useAiSync } from "../hooks/useAi";
import { useCareSync } from "../hooks/useCare";

export default function DashboardWindow() {
  useAiSync();
  useCareSync();
  return (
    <>
      <DashboardLayout />
      <Toaster />
    </>
  );
}
