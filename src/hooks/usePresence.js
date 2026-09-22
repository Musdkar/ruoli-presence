import { useEffect, useRef, useState } from "react";
import { fetchPresence, readCachedPresence, writeCachedPresence } from "../lib/lanyard-cache";

// How often to refresh while the tab is visible. The server puts a short shared
// cache in front of Lanyard, so this is cheap and stays well inside Lanyard's
// public rate limit.
export const PRESENCE_POLL_MS = 10000;
// Per-request ceiling. Without it a hung request would keep the in-flight guard
// closed and stop all further refreshes.
export const PRESENCE_TIMEOUT_MS = 8000;

// Single source of truth for presence in the browser: /api/presence, polled.
//
// Behaviour:
//   - immediate read on mount (seeded from the last-good cache so first paint
//     is instant and never flashes back to "not linked" while the first
//     request is in flight);
//   - refresh every PRESENCE_POLL_MS while the tab is visible;
//   - stop polling while hidden, refresh immediately on becoming visible again;
//   - at most one request in flight at a time;
//   - a failed refresh keeps the previous value (graceful degradation).
export function usePresence() {
  const [presence, setPresence] = useState(() => readCachedPresence());
  const presenceRef = useRef(presence);
  presenceRef.current = presence;
  const inFlightRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let timer = null;

    const load = async () => {
      if (disposed || inFlightRef.current) return;
      inFlightRef.current = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PRESENCE_TIMEOUT_MS);
      try {
        const next = await fetchPresence({ signal: controller.signal });
        if (disposed || !next) return;
        setPresence(next);
        writeCachedPresence(next);
      } catch {
        // Keep the last good value; a transient failure must not blank the UI.
      } finally {
        clearTimeout(timeout);
        inFlightRef.current = false;
      }
    };

    const start = () => {
      if (timer !== null) return;
      load();
      timer = setInterval(load, PRESENCE_POLL_MS);
    };
    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return presence;
}
