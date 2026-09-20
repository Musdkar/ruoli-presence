import { useEffect, useRef } from "react";
import { useT } from "../i18n";

// First-visit language gate. It is intentionally not dismissable (a language
// must be chosen), but it must stay usable by keyboard: focus moves into the
// dialog on mount and Tab is confined to it.
export default function LangPicker({ onChoose }) {
  const T = useT();
  const cardRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const focusables = () =>
      Array.from(
        card.querySelectorAll("button, [href], input, select, textarea, [tabindex]")
      ).filter((el) => !el.hasAttribute("disabled"));
    focusables()[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    card.addEventListener("keydown", onKeyDown);
    return () => card.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="lang-picker" role="dialog" aria-modal="true" aria-label={T.langPickerTitle}>
      <div className="lang-picker-card" ref={cardRef}>
        <h2>{T.langPickerTitle}</h2>
        <p>{T.langPickerBody}</p>
        <div className="lang-picker-actions">
          <button type="button" onClick={() => onChoose("en")}>
            English
          </button>
          <button type="button" onClick={() => onChoose("zh")}>
            中文
          </button>
        </div>
      </div>
    </div>
  );
}
