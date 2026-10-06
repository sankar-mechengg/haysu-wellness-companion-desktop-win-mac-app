import { useCallback, useEffect, useRef, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import Card from "../../common/Card";
import Markdown from "../../common/Markdown";
import { toast } from "../../common/Toast";
import CameraCapture from "./CameraCapture";
import { useAiStore, useConversation, useConversations } from "../../../hooks/useAi";
import { useTauriEvent } from "../../../hooks/useTauriEvent";
import { api, EVENTS, errorMessage, type AiKind, type ImageData } from "../../../lib/api";
import { AI_QUICK_ACTIONS } from "../../../lib/constants";
import { formatTimeOfDay, relativeDay } from "../../../lib/format";
import { useConfig } from "../../../store/appStore";

export default function AssistantView({
  initialConversation,
  kick,
}: {
  initialConversation?: number | null;
  /** Bumped by the dashboard to fire a quick action on arrival. */
  kick?: { kind: AiKind; n: number } | null;
}) {
  const status = useAiStore((s) => s.status);
  const config = useConfig();
  const conversations = useConversations();
  const [active, setActive] = useState<number | null>(initialConversation ?? null);
  const { messages, streaming, error, busy, send } = useConversation(active);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<{ data: ImageData; preview: string } | null>(null);
  const [camera, setCamera] = useState(false);
  const [pendingKind, setPendingKind] = useState<AiKind | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialConversation != null) setActive(initialConversation);
  }, [initialConversation]);

  useTauriEvent<number | null>(EVENTS.openAssistant, (id) => {
    if (typeof id === "number") setActive(id);
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming]);

  const ready = !!status?.active;

  const run = useCallback(
    async (kind: AiKind, message = "", img?: ImageData) => {
      if (!ready) {
        toast.error("Add an API key in Settings → Haysu AI first");
        return;
      }
      setDraft("");
      setImage(null);
      const id = await send({ kind, message, images: img ? [img] : [] });
      if (id != null && id !== active) setActive(id);
    },
    [ready, send, active]
  );

  const onSend = useCallback(() => {
    const text = draft.trim();
    if (!text && !image) return;
    const kind = pendingKind ?? "chat";
    setPendingKind(null);
    run(kind, text || (kind === "chat" ? "What do you notice?" : ""), image?.data);
  }, [draft, image, pendingKind, run]);

  const quick = useCallback(
    (kind: AiKind) => {
      if (kind === "posture") {
        setCamera(true);
        setPendingKind("posture");
        return;
      }
      setActive(null);
      run(kind);
    },
    [run]
  );

  // Quick action requested from another tab (Today / Health).
  const kickRef = useRef(0);
  useEffect(() => {
    if (!kick || kick.n === kickRef.current) return;
    kickRef.current = kick.n;
    quick(kick.kind);
  }, [kick, quick]);

  const onCaptured = useCallback(
    async (img: ImageData, preview: string) => {
      setCamera(false);
      setImage({ data: img, preview });
      if (config?.ai_keep_photos) {
        api.aiSavePhoto(img, "posture").catch(() => {});
      }
      if (pendingKind === "posture") {
        setActive(null);
        await run("posture", "", img);
        setPendingKind(null);
        setImage(null);
      } else {
        inputRef.current?.focus();
      }
    },
    [config?.ai_keep_photos, pendingKind, run]
  );

  const remove = async (id: number) => {
    const ok = await ask("Delete this conversation?", {
      title: "Delete",
      kind: "warning",
      okLabel: "Delete",
    });
    if (!ok) return;
    try {
      await api.aiDeleteConversation(id);
      if (active === id) setActive(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const kindIcon = (k: string) => AI_QUICK_ACTIONS.find((a) => a.kind === k)?.icon ?? "💬";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 animate-fade-in">
      {/* History */}
      <Card padding="sm" className="xl:col-span-1 flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-1 mb-1">
          <p className="text-[11px] uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
            Conversations
          </p>
          <button
            type="button"
            onClick={() => {
              setActive(null);
              setDraft("");
              setImage(null);
              inputRef.current?.focus();
            }}
            className="text-[11px] text-haysu-500 font-medium hover:text-haysu-600"
          >
            + New
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto space-y-0.5">
          {conversations.length === 0 && (
            <li className="text-[11px] text-text-secondary dark:text-text-secondary-dark px-2 py-3">
              Nothing yet. Try a quick action →
            </li>
          )}
          {conversations.map((c) => (
            <li key={c.id} className="group">
              <button
                type="button"
                onClick={() => setActive(c.id)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                  active === c.id
                    ? "bg-haysu-500/10 text-haysu-600 dark:text-haysu-300"
                    : "text-text-primary dark:text-text-primary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                }`}
              >
                <span>{kindIcon(c.kind)}</span>
                <span className="flex-1 truncate">{c.title}</span>
                <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">
                  {relativeDay(c.updated_at.slice(0, 10))}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(c.id);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && remove(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-tomato"
                  title="Delete"
                >
                  ✕
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Chat */}
      <div className="xl:col-span-3 flex flex-col gap-3 min-h-[60vh]">
        {/* Status strip */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {ready ? (
            <span className="px-2 h-6 inline-flex items-center rounded-md bg-move/15 text-move font-medium">
              ● {status?.providers.find((p) => p.provider === status.active)?.label} ·{" "}
              {status?.active_model}
            </span>
          ) : (
            <span className="px-2 h-6 inline-flex items-center rounded-md bg-amber/20 text-amber font-medium">
              No API key yet
            </span>
          )}
          <span className="text-text-secondary dark:text-text-secondary-dark">
            {config?.ai_share_health
              ? "Answers use your local records; nothing is stored by Haysu online."
              : "Record sharing is off; answers use only what you type."}
          </span>
          <button
            type="button"
            onClick={() => api.showWindow("settings")}
            className="text-haysu-500 hover:text-haysu-600 font-medium"
          >
            Settings
          </button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-1.5">
          {AI_QUICK_ACTIONS.map((a) => (
            <button
              key={a.kind}
              type="button"
              onClick={() => quick(a.kind)}
              disabled={busy}
              title={a.hint}
              className="group h-14 rounded-xl border border-border/60 dark:border-border-dark/60 bg-surface dark:bg-surface-dark hover:border-haysu-300 hover:-translate-y-0.5 transition-all text-left px-2.5 disabled:opacity-50"
            >
              <div className="text-base leading-none">{a.icon}</div>
              <div className="text-[11px] font-medium text-text-primary dark:text-text-primary-dark mt-1 truncate">
                {a.label}
              </div>
            </button>
          ))}
        </div>

        {camera && (
          <CameraCapture
            onCapture={onCaptured}
            onClose={() => {
              setCamera(false);
              setPendingKind(null);
            }}
          />
        )}

        {/* Messages */}
        <Card padding="md" className="flex-1 overflow-y-auto max-h-[52vh] min-h-[220px]">
          {messages.length === 0 && !streaming && (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="text-4xl mb-2">✨</div>
              <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                Haysu AI knows your records
              </p>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark max-w-sm mt-1">
                Ask about your week, what to eat, what to wear, or how to handle a symptom. Try a
                quick action above or type below.
              </p>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    m.role === "user"
                      ? "bg-haysu-500 text-white rounded-br-md"
                      : "bg-surface-hover dark:bg-surface-hover-dark rounded-bl-md"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">
                      {m.has_image && <span className="mr-1">📷</span>}
                      {m.content}
                    </p>
                  ) : (
                    <Markdown text={m.content} />
                  )}
                  <p
                    className={`text-[10px] mt-1 ${
                      m.role === "user"
                        ? "text-white/70"
                        : "text-text-secondary dark:text-text-secondary-dark"
                    }`}
                  >
                    {formatTimeOfDay(m.created_at)}
                    {m.role === "assistant" && m.model && ` · ${m.model}`}
                  </p>
                </div>
              </div>
            ))}
            {streaming !== null && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-surface-hover dark:bg-surface-hover-dark">
                  {streaming ? (
                    <Markdown text={streaming} />
                  ) : (
                    <span className="inline-flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-haysu-500 animate-pulse-soft" />
                      <span className="w-1.5 h-1.5 rounded-full bg-haysu-500 animate-pulse-soft [animation-delay:200ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-haysu-500 animate-pulse-soft [animation-delay:400ms]" />
                    </span>
                  )}
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-tomato/10 border border-tomato/30 px-3 py-2 text-xs text-tomato">
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </Card>

        {/* Composer */}
        <Card padding="sm">
          {image && (
            <div className="flex items-center gap-2 mb-2">
              <img
                src={image.preview}
                alt="attachment"
                className="h-14 w-14 object-cover rounded-lg"
              />
              <span className="text-xs text-text-secondary dark:text-text-secondary-dark flex-1">
                Photo attached. Ask something or just send.
              </span>
              <button
                type="button"
                onClick={() => setImage(null)}
                className="text-xs text-text-secondary hover:text-tomato"
              >
                Remove
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setCamera((c) => !c)}
              title="Attach a photo"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-hover dark:bg-surface-hover-dark text-text-secondary hover:text-text-primary dark:hover:text-text-primary-dark"
            >
              📷
            </button>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              rows={1}
              placeholder={
                ready
                  ? "Ask Haysu anything about your day, food, sleep, symptoms…"
                  : "Add an API key in Settings → Haysu AI to start"
              }
              disabled={!ready || busy}
              className="flex-1 resize-none px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300 disabled:opacity-60 max-h-32"
              style={{ height: Math.min(128, 40 + Math.max(0, draft.split("\n").length - 1) * 20) }}
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!ready || busy || (!draft.trim() && !image)}
              className="h-9 px-4 rounded-xl bg-haysu-500 text-white text-sm font-semibold hover:bg-haysu-600 disabled:opacity-40"
            >
              {busy ? "…" : "Send"}
            </button>
          </div>
          <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1.5">
            Enter to send · Shift+Enter for a new line · Haysu AI is not a doctor; urgent symptoms
            need a clinician.
          </p>
        </Card>
      </div>
    </div>
  );
}
