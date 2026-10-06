import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import { useBootstrap } from "./hooks/useBootstrap";
import { useAppStore } from "./store/appStore";
import AnimatedH from "./components/common/AnimatedH";

const WidgetWindow = lazy(() => import("./windows/WidgetWindow"));
const PopupWindow = lazy(() => import("./windows/PopupWindow"));
const DashboardWindow = lazy(() => import("./windows/DashboardWindow"));
const SettingsWindow = lazy(() => import("./windows/SettingsWindow"));
const OnboardingWindow = lazy(() => import("./windows/OnboardingWindow"));

export type WindowKind = "widget" | "popup" | "dashboard" | "settings" | "onboarding";

/** Which window this webview is, taken from the URL once at startup. */
export const WINDOW: WindowKind = (() => {
  const w = new URLSearchParams(window.location.search).get("window");
  return (["widget", "popup", "dashboard", "settings", "onboarding"] as const).includes(
    w as WindowKind
  )
    ? (w as WindowKind)
    : "dashboard";
})();

const TRANSPARENT_WINDOWS: WindowKind[] = ["widget", "popup"];
if (TRANSPARENT_WINDOWS.includes(WINDOW)) {
  document.documentElement.classList.add("transparent");
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Haysu] render error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
          <AnimatedH size={40} />
          <h2 className="text-base font-semibold text-tomato">Something went wrong</h2>
          <pre className="text-xs text-text-secondary dark:text-text-secondary-dark whitespace-pre-wrap max-w-md">
            {this.state.error}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 rounded-xl bg-haysu-500 text-white text-sm"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Loading() {
  if (TRANSPARENT_WINDOWS.includes(WINDOW)) return null;
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <AnimatedH size={36} loading />
    </div>
  );
}

function Router() {
  useBootstrap();
  const ready = useAppStore((s) => s.ready);
  if (!ready) return <Loading />;

  switch (WINDOW) {
    case "widget":
      return <WidgetWindow />;
    case "popup":
      return <PopupWindow />;
    case "settings":
      return <SettingsWindow />;
    case "onboarding":
      return <OnboardingWindow />;
    default:
      return <DashboardWindow />;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Router />
      </Suspense>
    </ErrorBoundary>
  );
}
