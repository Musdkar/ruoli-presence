import { useLang, setLang } from "../i18n";

export default function LangToggle() {
  const lang = useLang();
  const next = lang === "en" ? "zh" : "en";
  return (
    <button
      type="button"
      className="theme-toggle lang-toggle"
      onClick={() => setLang(next)}
      aria-label="Language"
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        译
      </span>
      <span className="theme-toggle-label">{lang === "zh" ? "中文" : "EN"}</span>
    </button>
  );
}
