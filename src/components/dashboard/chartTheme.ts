import type { CSSProperties } from "react";
import { useAppStore } from "../../store/appStore";

/** Shared Recharts styling that follows the resolved theme. */
export function useChartTheme() {
  const dark = useAppStore((s) => s.resolvedTheme) === "dark";
  const tick = { fontSize: 11, fill: dark ? "#9ca3af" : "#6b7280" };
  const tooltipStyle: CSSProperties = {
    background: dark ? "rgba(34,35,60,0.97)" : "rgba(255,255,255,0.97)",
    border: `1px solid ${dark ? "#363856" : "#e5e7eb"}`,
    borderRadius: 12,
    fontSize: 12,
    color: dark ? "#e8e9f0" : "#1a1b2e",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  };
  const muted = dark ? "#363856" : "#e5e7eb";
  return {
    dark,
    tick,
    tooltipStyle,
    muted,
    cursor: { fill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" },
  };
}
