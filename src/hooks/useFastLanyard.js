import { useEffect, useMemo, useRef, useState } from "react";
import { useLanyard } from "use-lanyard";
import {
  fetchPresence,
  readCachedPresence,
  sanitizePresence,
  writeCachedPresence,
} from "../lib/lanyard-cache";

// Presence has one shape and one sanitizer (the shared module), but during the
// transition it still has two transports: the use-lanyard websocket (live) and
// our own /api/presence proxy (first paint + fallback when the socket cannot
// connect). The cache key stays the id so an existing local snapshot is reused.
export function useFastLanyard(userId) {
  const live = useLanyard(userId);
  const liveRef = useRef(live);
  liveRef.current = live;
  const [cached, setCached] = useState(() => readCachedPresence(userId));
  const sanitizedLive = useMemo(() => sanitizePresence(live), [live]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    fetchPresence({ signal: controller.signal })
      .then((next) => {
        if (!next || liveRef.current) return;
        setCached(next);
        writeCachedPresence(userId, next);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [userId]);

  useEffect(() => {
    const next = sanitizedLive;
    if (!next) return;
    setCached(next);
    writeCachedPresence(userId, next);
  }, [sanitizedLive, userId]);

  return sanitizedLive || cached;
}
