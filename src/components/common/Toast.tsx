import { useEffect, useState } from "react";
import { create } from "zustand";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastStore {
  items: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  remove: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (kind, message) =>
    set((s) => ({ items: [...s.items.slice(-2), { id: nextId++, kind, message }] })),
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().push("success", m),
  error: (m: string) => useToastStore.getState().push("error", m),
  info: (m: string) => useToastStore.getState().push("info", m),
};

function ToastView({ item }: { item: ToastItem }) {
  const remove = useToastStore((s) => s.remove);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const ttl = item.kind === "error" ? 5000 : 2200;
    const t1 = setTimeout(() => setLeaving(true), ttl - 200);
    const t2 = setTimeout(() => remove(item.id), ttl);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [item, remove]);

  const color =
    item.kind === "success"
      ? "border-move/40 text-move"
      : item.kind === "error"
        ? "border-tomato/40 text-tomato"
        : "border-haysu-300/50 text-haysu-600 dark:text-haysu-300";
  const icon = item.kind === "success" ? "✓" : item.kind === "error" ? "!" : "i";

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-surface dark:bg-surface-dark shadow-lg text-xs font-medium transition-opacity duration-200 ${color} ${
        leaving ? "opacity-0" : "opacity-100 animate-pop"
      }`}
    >
      <span className="font-bold">{icon}</span>
      <span className="text-text-primary dark:text-text-primary-dark">{item.message}</span>
    </div>
  );
}

/** Mount once per window. */
export function Toaster() {
  const items = useToastStore((s) => s.items);
  return (
    <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <ToastView key={t.id} item={t} />
      ))}
    </div>
  );
}
