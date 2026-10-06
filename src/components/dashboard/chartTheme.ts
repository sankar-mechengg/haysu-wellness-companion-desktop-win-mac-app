import type { CSSProperties } from "react";
import { useAppStore } from "../../store/appStore";

/** Shared Recharts styling that follows the resolved theme and dark variant. */
export function useChartTheme() {
  const dark = useAppStore((s) => s.resolvedTheme) === "dark";
  const blue = useAppStore((s) => s.config?.dark_variant) === "blue";
  const surface = dark ? (blue ? "#22233c" : "#232327") : "#ffffff";
  const border = dark ? (blue ? "#363856" : "#3a3a42") : "#e5e7eb";
  const tick = { fontSize: 11, fill: dark ? "#a1a1aa" : "#6b7280" };
  const tooltipStyle: CSSProperties = {
    background: surface,
    border: `1px solid ${border}`,
    borderRadius: 12,
    fontSize: 12,
    color: dark ? "#ececef" : "#1a1b2e",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  };
  return {
    dark,
    surface,
    tick,
    tooltipStyle,
    muted: border,
    grid: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    cursor: { fill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" },
  };
}
