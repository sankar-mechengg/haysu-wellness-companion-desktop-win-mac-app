import { Component, useEffect, useState, lazy, Suspense, type ReactNode, type ErrorInfo } from "react";
import { useTheme } from "./hooks/useTheme";

const PopupWindow = lazy(() => import("./windows/PopupWindow"));
const WidgetWindow = lazy(() => import("./windows/WidgetWindow"));
const DashboardWindow = lazy(() => import("./windows/DashboardWindow"));
const OnboardingWindow = lazy(() => import("./windows/OnboardingWindow"));
const SettingsWindow = lazy(() => import("./windows/SettingsWindow"));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Haysu] React error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "sans-serif" }}>
          <h2 style={{ color: "#e53e3e" }}>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#666" }}>
            {this.state.error}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function WindowRouter() {
  const [windowType, setWindowType] = useState<string>("main");
  const { theme, initTheme } = useTheme();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const win = params.get("window") || "main";
    console.log("[Haysu] Window type:", win);
    setWindowType(win);
    initTheme();
    if (["popup", "widget"].includes(win)) {
      document.body.classList.add("transparent");
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [theme]);

  const fallback = (
    <div className="h-screen w-screen flex items-center justify-center bg-bg dark:bg-bg-dark">
      <p className="text-sm text-text-secondary">Loading...</p>
    </div>
  );

  switch (windowType) {
    case "popup":
      return <Suspense fallback={fallback}><PopupWindow /></Suspense>;
    case "widget":
      return <Suspense fallback={fallback}><WidgetWindow /></Suspense>;
    case "dashboard":
      return <Suspense fallback={fallback}><DashboardWindow /></Suspense>;
    case "onboarding":
      return <Suspense fallback={fallback}><OnboardingWindow /></Suspense>;
    case "settings":
      return <Suspense fallback={fallback}><SettingsWindow /></Suspense>;
    default:
      return <MainBackground />;
  }
}

function MainBackground() {
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <WindowRouter />
    </ErrorBoundary>
  );
}

export default App;
