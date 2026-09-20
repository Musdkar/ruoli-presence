import { useEffect, useState } from "react";

const THEME_KEY = "theme";
const THEME_MODES = ["dark", "light", "system"];
function applyThemeMode(mode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(resolved);
  el.style.colorScheme = resolved;
}
function useTheme() {
  const [stored, setStored] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || "system";
    } catch {
      return "system";
    }
  });
  useEffect(() => {
    applyThemeMode(stored);
    try {
      localStorage.setItem(THEME_KEY, stored);
    } catch {}
    if (stored !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [stored]);
  const cycle = () =>
    setStored((cur) => THEME_MODES[(THEME_MODES.indexOf(cur) + 1) % THEME_MODES.length]);
  return { stored, cycle };
}
export { THEME_MODES, useTheme };
