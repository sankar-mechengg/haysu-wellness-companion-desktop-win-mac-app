import { useEffect, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * Subscribe to a Tauri event for the lifetime of the component.
 * Safe under StrictMode: if the component unmounts before `listen` resolves,
 * the listener is released as soon as it is created.
 */
export function useTauriEvent<T = unknown>(eventName: string, handler: (payload: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let active = true;
    let unlisten: UnlistenFn | null = null;

    listen<T>(eventName, (event) => {
      if (active) handlerRef.current(event.payload);
    })
      .then((fn) => {
        if (active) unlisten = fn;
        else fn();
      })
      .catch((e) => console.error(`[Haysu] listen(${eventName}) failed:`, e));

    return () => {
      active = false;
      unlisten?.();
    };
  }, [eventName]);
}
