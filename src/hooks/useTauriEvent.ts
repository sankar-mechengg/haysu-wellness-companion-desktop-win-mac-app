import { useEffect, useRef } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

/**
 * Hook to listen for Tauri events from the Rust backend.
 * Automatically cleans up the listener on unmount.
 *
 * @param eventName - The event name to listen for
 * @param handler - Callback when event is received
 */
export function useTauriEvent<T = unknown>(
  eventName: string,
  handler: (payload: T) => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let mounted = true;

    const setup = async () => {
      try {
        unlisten = await listen<T>(eventName, (event) => {
          if (mounted) {
            handlerRef.current(event.payload);
          }
        });
      } catch (e) {
        console.error(`Failed to listen for event "${eventName}":`, e);
      }
    };

    setup();

    return () => {
      mounted = false;
      if (unlisten) unlisten();
    };
  }, [eventName]);
}

/**
 * Listen to multiple events at once.
 *
 * @param events - Map of event names to handlers
 */
export function useTauriEvents(
  events: Record<string, (payload: unknown) => void>
) {
  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];
    let mounted = true;

    const setup = async () => {
      for (const [name, handler] of Object.entries(events)) {
        try {
          const unlisten = await listen(name, (event) => {
            if (mounted) handler(event.payload);
          });
          unlisteners.push(unlisten);
        } catch (e) {
          console.error(`Failed to listen for event "${name}":`, e);
        }
      }
    };

    setup();

    return () => {
      mounted = false;
      unlisteners.forEach((fn) => fn());
    };
  }, []);
}
