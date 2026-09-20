import { useT } from "../i18n";

export default function LangPicker({ onChoose }) {
  const T = useT();
  return (
    <div className="lang-picker" role="dialog" aria-modal="true" aria-label={T.langPickerTitle}>
      <div className="lang-picker-card">
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
