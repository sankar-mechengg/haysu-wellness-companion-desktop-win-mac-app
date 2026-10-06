import DashboardLayout from "../components/dashboard/DashboardLayout";
import { Toaster } from "../components/common/Toast";

export default function DashboardWindow() {
  return (
    <>
      <DashboardLayout />
      <Toaster />
    </>
  );
}
