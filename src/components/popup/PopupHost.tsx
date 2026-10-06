import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { api, EVENTS, type MedicineReminderData, type ReminderEvent } from "../../lib/api";
import { useTauriEvent } from "../../hooks/useTauriEvent";
import WaterPopup from "./WaterPopup";
import MovementPopup from "./MovementPopup";
import PomodoroPopup from "./PomodoroPopup";
import MedicinePopup from "./MedicinePopup";

const WIDTH = 440;

function parseMedicine(data: string | null): MedicineReminderData | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as MedicineReminderData;
  } catch {
    return null;
  }
}

/**
 * Owns the reminder queue for the popup window and sizes the native window to
 * whatever card is showing.
 */
export default function PopupHost() {
  const [queue, setQueue] = useState<ReminderEvent[]>([]);
  const current = queue[0] ?? null;
  const cardRef = useRef<HTMLDivElement>(null);

  useTauriEvent<ReminderEvent>(EVENTS.reminder, (r) => {
    setQueue((q) => {
      // Replace a pending reminder of the same kind rather than stacking it,
      // except medicines, where each dose matters.
      const rest = q.filter(
        (x, i) => i === 0 || x.kind !== r.kind || (r.kind === "medicine" && x.data !== r.data)
      );
      return [...rest, r];
    });
  });

  const dismiss = useCallback(() => {
    setQueue((q) => {
      const next = q.slice(1);
      if (next.length === 0) api.hidePopup().catch(() => {});
      return next;
    });
  }, []);

  // Fit the window to the card.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const win = getCurrentWindow();
    const fit = () => {
      const h = Math.ceil(el.getBoundingClientRect().height) + 16;
      win.setSize(new LogicalSize(WIDTH, Math.max(120, h))).catch(() => {});
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [current?.id]);

  if (!current) {
    return <div className="h-screen w-screen" />;
  }

  const medicine = current.kind === "medicine" ? parseMedicine(current.data) : null;

  return (
    <div className="h-screen w-screen flex items-start justify-center pt-1">
      <div ref={cardRef} className="w-full px-1">
        {current.kind === "water" && <WaterPopup key={current.id} onDone={dismiss} />}
        {current.kind === "movement" && (
          <MovementPopup key={current.id} exerciseId={current.data ?? undefined} onDone={dismiss} />
        )}
        {current.kind === "pomodoro" && (
          <PomodoroPopup
            key={current.id}
            eventType={(current.data as "work_complete" | "break_complete") ?? "work_complete"}
            onDone={dismiss}
          />
        )}
        {current.kind === "medicine" &&
          (medicine ? (
            <MedicinePopup key={current.id} data={medicine} onDone={dismiss} />
          ) : (
            // Malformed payload: drop it rather than block the queue.
            <DropNow onDone={dismiss} />
          ))}
        {queue.length > 1 && (
          <p className="text-center text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1">
            +{queue.length - 1} more waiting
          </p>
        )}
      </div>
    </div>
  );
}

function DropNow({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    onDone();
  }, [onDone]);
  return null;
}
