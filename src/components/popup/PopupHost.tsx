import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import {
  api,
  EVENTS,
  type CareReminderData,
  type MedicineReminderData,
  type ReminderEvent,
} from "../../lib/api";
import { useTauriEvent } from "../../hooks/useTauriEvent";
import WaterPopup from "./WaterPopup";
import MovementPopup from "./MovementPopup";
import PomodoroPopup from "./PomodoroPopup";
import MedicinePopup from "./MedicinePopup";
import CarePopup from "./CarePopup";
import BriefingPopup from "./BriefingPopup";

const WIDTH = 440;

function parseJson<T>(data: string | null): T | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
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
      // except medicines and care routines, where each one matters.
      const keepEach = r.kind === "medicine" || r.kind === "care";
      const rest = q.filter(
        (x, i) => i === 0 || x.kind !== r.kind || (keepEach && x.data !== r.data)
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

  const medicine =
    current.kind === "medicine" ? parseJson<MedicineReminderData>(current.data) : null;
  const care = current.kind === "care" ? parseJson<CareReminderData>(current.data) : null;

  let body: React.ReactNode;
  switch (current.kind) {
    case "water":
      body = <WaterPopup key={current.id} onDone={dismiss} />;
      break;
    case "movement":
      body = (
        <MovementPopup key={current.id} exerciseId={current.data ?? undefined} onDone={dismiss} />
      );
      break;
    case "pomodoro":
      body = (
        <PomodoroPopup
          key={current.id}
          eventType={(current.data as "work_complete" | "break_complete") ?? "work_complete"}
          onDone={dismiss}
        />
      );
      break;
    case "medicine":
      body = medicine ? (
        <MedicinePopup key={current.id} data={medicine} onDone={dismiss} />
      ) : (
        <DropNow onDone={dismiss} />
      );
      break;
    case "care":
      body = care ? (
        <CarePopup key={current.id} data={care} onDone={dismiss} />
      ) : (
        <DropNow onDone={dismiss} />
      );
      break;
    case "briefing":
      body = (
        <BriefingPopup
          key={current.id}
          message={current.message}
          conversationId={current.data ? Number(current.data) : null}
          onDone={dismiss}
        />
      );
      break;
    default:
      body = <DropNow onDone={dismiss} />;
  }

  return (
    <div className="h-screen w-screen flex items-start justify-center pt-1">
      <div ref={cardRef} className="w-full px-1">
        {body}
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
