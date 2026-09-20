import { useEffect, useRef, useState } from "react";
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
    const next = sanitizePresence(live);
    if (!next) return;
    setCached(next);
    writeCachedPresence(userId, next);
  }, [live, userId]);

  return live || cached;
}
