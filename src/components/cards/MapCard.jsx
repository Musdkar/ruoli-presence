import { useEffect, useRef, useState } from "react";
import { config } from "../../config";
import { useT } from "../../i18n";
import { useResolvedTheme } from "../../hooks/useResolvedTheme";
import MAP_STYLE from "../../data/mapStyle";

export default function MapCard({ active }) {
  const T = useT();
  const ref = useRef(null);
  const resolvedTheme = useResolvedTheme();
  const mapRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!active || shouldLoad || !ref.current) return;
    const node = ref.current;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }
    let idleId = null;
    let timerId = null;
    const scheduleLoad = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => setShouldLoad(true), { timeout: 1500 });
      } else {
        timerId = window.setTimeout(() => setShouldLoad(true), 500);
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        scheduleLoad();
      },
      { root: null, rootMargin: "160px 0px" }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (idleId != null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, [active, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || !ref.current) return;
    let disposed = false;
    let map;
    const init = async () => {
      try {
        const [{ default: maplibregl }] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        if (disposed || !ref.current) return;
        const theme = document.documentElement.classList.contains("light") ? "light" : "dark";
        map = new maplibregl.Map({
          container: ref.current,
          style: MAP_STYLE[theme],
          center: [config.lng, config.lat],
          zoom: 8.4,
          attributionControl: false,
          interactive: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
        map.on("error", () => {});
        map.once("load", () => {
          if (!disposed) setReady(true);
        });
      } catch (error) {
        if (disposed) return;
        console.error("Map failed to initialise", error);
        setFailed(true);
      }
    };
    init();
    return () => {
      disposed = true;
      mapRef.current = null;
      try {
        map?.remove();
      } catch {}
    };
  }, [shouldLoad]);

  useEffect(() => {
    const map = mapRef.current;
    if (map === null) return;
    try {
      map.setStyle(MAP_STYLE[resolvedTheme]);
    } catch (error) {
      console.error("Map style switch failed", error);
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => mapRef.current?.resize());
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <article className="card map-card" aria-busy={shouldLoad && !ready && !failed}>
      <div ref={ref} className={`map-canvas${ready ? " is-ready" : ""}`} />
      <div className="map-shade" />
      <h2>{config.city}</h2>
      <div className="map-avatar">
        <img
          src={config.mapAvatar}
          alt={T.mapAvatarAlt}
          width="66"
          height="66"
          loading="lazy"
          decoding="async"
        />
      </div>
      {shouldLoad && !ready && (
        <span className="map-loading" role="status">
          {failed ? T.mapUnavailable : T.mapLoading}
        </span>
      )}
      <div className="map-pill">
        ◎ {config.city}, {config.region}
      </div>
    </article>
  );
}
