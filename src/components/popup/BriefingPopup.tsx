import { useCallback } from "react";
import { emit } from "@tauri-apps/api/event";
import PopupContainer, { type PopupAction } from "./PopupContainer";
import { api, EVENTS } from "../../lib/api";

const ACCENT = "#3b93f7";

export default function BriefingPopup({
  message,
  conversationId,
  onDone,
}: {
  message: string;
  conversationId: number | null;
  onDone: () => void;
}) {
  const openIt = useCallback(async () => {
    await api.showWindow("dashboard").catch(() => {});
    // The dashboard listens for this and switches to the AI tab.
    await emit(EVENTS.openAssistant, conversationId).catch(() => {});
    onDone();
  }, [conversationId, onDone]);

  const actions: PopupAction[] = [
    { label: "Read briefing", onClick: openIt, hotkey: "Enter" },
    { label: "Later", onClick: onDone, variant: "ghost", hotkey: "Escape" },
  ];

  return (
    <PopupContainer accent={ACCENT} onDone={onDone} actions={actions}>
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${ACCENT}22` }}
        >
          ☀️
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            Your daily briefing is ready
          </h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </PopupContainer>
  );
}
