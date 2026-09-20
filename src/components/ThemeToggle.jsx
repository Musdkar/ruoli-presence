import { THEME_MODES, useTheme } from "../hooks/useTheme";

const themeIcon = (mode) => (mode === "light" ? "☀" : mode === "dark" ? "☾" : "◐");

export default function ThemeToggle() {
  const { stored, cycle } = useTheme();
  const next = THEME_MODES[(THEME_MODES.indexOf(stored) + 1) % THEME_MODES.length];
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={cycle}
      title={`Theme: ${stored} — switch to ${next}`}
      aria-label={`Theme: ${stored}. Switch to ${next}`}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {themeIcon(stored)}
      </span>
      <span className="theme-toggle-label">{stored}</span>
    </button>
  );
}
