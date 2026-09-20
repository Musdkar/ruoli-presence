import { useT } from "../../i18n";
import CardHead from "./CardHead.jsx";
import Empty from "./EmptyState.jsx";

export default function KeyboardCard({ keyboard, layout, title, note, device }) {
  const T = useT();
  if (!keyboard) {
    return (
      <article className={"card keyboard-card keyboard-card--" + (device || "mac")}>
        <CardHead title={title || "Keyboard / today"} />
        <Empty label={T.keyboardNotLinked} detail={note || T.keyboardNotLinkedDetail} />
      </article>
    );
  }
  return (
    <article className={"card keyboard-card keyboard-card--" + (device || "mac")}>
      <CardHead
        title={title || "Keyboard / today"}
        meta={keyboard.total.toLocaleString() + " " + T.keys}
      />
      <div
        className="keyboard-heatmap"
        style={{ "--kb-rows": layout.length }}
        aria-label={(title || "Keyboard") + " heatmap for " + keyboard.date}
      >
        {layout.map((row, rowIndex) => (
          <div className="keyboard-row" key={rowIndex}>
            {row.map((item, index) => {
              const level = keyboard.heat[item.key] || 0;
              return (
                <div
                  className="keyboard-key"
                  key={rowIndex + "-" + index}
                  style={{ "--key-u": item.u || 1, "--heat": level / 15 }}
                  title={item.label || T.space}
                >
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </article>
  );
}
