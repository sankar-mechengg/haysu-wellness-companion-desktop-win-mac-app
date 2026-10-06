import { useEffect, useRef, useState } from "react";
import { formatHotkey, hotkeyFromKeyboardEvent } from "../../lib/format";
import { usePlatform } from "../../store/appStore";

interface HotkeyRecorderProps {
  value: string;
  onChange: (combo: string) => void;
  error?: string;
}

/**
 * Click, then press a key combination. Escape cancels, Backspace clears.
 */
export default function HotkeyRecorder({ value, onChange, error }: HotkeyRecorderProps) {
  const platform = usePlatform();
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(false);
        setPreview(null);
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        onChange("");
        setRecording(false);
        setPreview(null);
        return;
      }
      const combo = hotkeyFromKeyboardEvent(e);
      if (!combo) {
        // Only modifiers so far; show them as a hint.
        const mods = [
          e.ctrlKey || e.metaKey ? "CmdOrCtrl" : "",
          e.altKey ? "Alt" : "",
          e.shiftKey ? "Shift" : "",
        ]
          .filter(Boolean)
          .join("+");
        setPreview(mods || null);
        return;
      }
      onChange(combo);
      setRecording(false);
      setPreview(null);
    };
    const onBlur = () => {
      setRecording(false);
      setPreview(null);
    };
    const el = ref.current;
    window.addEventListener("keydown", onKey, true);
    el?.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      el?.removeEventListener("blur", onBlur);
    };
  }, [recording, onChange]);

  const text = recording
    ? preview
      ? `${formatHotkey(preview, platform)}…`
      : "Press keys…"
    : value
      ? formatHotkey(value, platform)
      : "Not set";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        ref={ref}
        type="button"
        onClick={() => setRecording((r) => !r)}
        className={`min-w-[140px] px-3 py-1.5 rounded-lg font-mono text-xs border transition-all
          focus:outline-none focus-visible:ring-2 focus-visible:ring-haysu-300
          ${
            recording
              ? "border-haysu-500 bg-haysu-50 dark:bg-haysu-500/10 text-haysu-600 dark:text-haysu-300 animate-pulse-soft"
              : error
                ? "border-tomato/60 bg-tomato-light dark:bg-tomato/10 text-tomato"
                : "border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text-primary dark:text-text-primary-dark hover:border-haysu-300"
          }`}
        title={
          recording ? "Press a combination. Esc cancels, Backspace clears." : "Click to change"
        }
      >
        {text}
      </button>
      {error && <span className="text-[11px] text-tomato max-w-[220px] text-right">{error}</span>}
    </div>
  );
}
