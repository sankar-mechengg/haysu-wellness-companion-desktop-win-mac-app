import { useEffect } from "react";
import FloatingWidget from "../components/widget/FloatingWidget";
import { useTheme } from "../hooks/useTheme";

export default function WidgetWindow() {
  const { initTheme } = useTheme();

  useEffect(() => {
    initTheme();
    // Make body transparent for the widget
    document.body.classList.add("transparent");
    document.body.style.background = "transparent";
  }, [initTheme]);

  return <FloatingWidget />;
}
