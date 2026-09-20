import { useEffect, useMemo, useRef, useState } from "react";
import { useLanyard } from "use-lanyard";
import {
  fetchLanyardPresence,
  readCachedPresence,
  sanitizePresence,
  writeCachedPresence,
} from "../lib/lanyard-cache";

export function useFastLanyard(userId) {
  const live = useLanyard(userId);
  const liveRef = useRef(live);
  liveRef.current = live;
  const [cached, setCached] = useState(() => readCachedPresence(userId));
  const sanitizedLive = useMemo(() => sanitizePresence(live), [live]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    fetchLanyardPresence(userId, { signal: controller.signal })
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
