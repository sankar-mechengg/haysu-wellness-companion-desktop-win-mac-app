import { useCallback, useEffect, useRef, useState } from "react";
import { create } from "zustand";
import {
  api,
  EVENTS,
  errorMessage,
  type AiKind,
  type AiStatus,
  type Conversation,
  type ImageData,
  type StoredMessage,
} from "../lib/api";
import { useTauriEvent } from "./useTauriEvent";

interface AiStore {
  status: AiStatus | null;
  setStatus: (s: AiStatus) => void;
  historyVersion: number;
  bumpHistory: () => void;
}

export const useAiStore = create<AiStore>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
  historyVersion: 0,
  bumpHistory: () => set((s) => ({ historyVersion: s.historyVersion + 1 })),
}));

/** Mount once per window: keeps provider status and history fresh. */
export function useAiSync() {
  const setStatus = useAiStore((s) => s.setStatus);
  const bump = useAiStore((s) => s.bumpHistory);
  useEffect(() => {
    api
      .aiStatus()
      .then(setStatus)
      .catch(() => {});
  }, [setStatus]);
  useTauriEvent<AiStatus>(EVENTS.aiStatus, setStatus);
  useTauriEvent(EVENTS.aiHistory, () => bump());
}

export function useConversations() {
  const version = useAiStore((s) => s.historyVersion);
  const [list, setList] = useState<Conversation[]>([]);
  useEffect(() => {
    api
      .aiConversations()
      .then(setList)
      .catch(() => {});
  }, [version]);
  return list;
}

/** Live view of one conversation, including the streaming reply. */
export function useConversation(conversationId: number | null) {
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const idRef = useRef(conversationId);
  idRef.current = conversationId;

  const reload = useCallback(async () => {
    if (conversationId == null) {
      setMessages([]);
      return;
    }
    try {
      setMessages(await api.aiMessages(conversationId));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [conversationId]);

  useEffect(() => {
    setStreaming(null);
    setError(null);
    reload();
  }, [reload]);

  useTauriEvent<{ conversation_id: number; delta: string }>(EVENTS.aiDelta, (ev) => {
    if (ev.conversation_id !== idRef.current) return;
    setStreaming((s) => (s ?? "") + ev.delta);
  });
  useTauriEvent<{ conversation_id: number; message: StoredMessage }>(EVENTS.aiDone, (ev) => {
    if (ev.conversation_id !== idRef.current) return;
    setStreaming(null);
    setMessages((m) => (m.some((x) => x.id === ev.message.id) ? m : [...m, ev.message]));
  });
  useTauriEvent<{ conversation_id: number; error: string }>(EVENTS.aiError, (ev) => {
    if (ev.conversation_id !== idRef.current) return;
    setStreaming(null);
    setError(ev.error);
  });

  /**
   * Send a message. Returns the conversation id (new conversations get one).
   * The caller should switch to it so streaming events are picked up.
   */
  const send = useCallback(
    async (opts: { message?: string; kind?: AiKind; images?: ImageData[] }) => {
      setBusy(true);
      setError(null);
      setStreaming("");
      try {
        const res = await api.aiSend({
          conversation_id: idRef.current,
          message: opts.message ?? "",
          kind: opts.kind ?? "chat",
          images: opts.images ?? [],
        });
        return res.conversation_id;
      } catch (e) {
        setStreaming(null);
        setError(errorMessage(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    []
  );

  return { messages, streaming, error, busy, send, reload, setMessages };
}
