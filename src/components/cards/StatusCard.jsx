import { useT } from "../../i18n";
import CardHead from "./CardHead.jsx";

export default function StatusCard({ displayPresence }) {
  const T = useT();
  const { status, label, labelKey } = displayPresence;
  return (
    <article className="card status-card">
      <CardHead title={T.status} />
      <div className="status-main">
        <span className={`status-dot ${status}`} />
        <strong>{(labelKey && T[labelKey]) || label}</strong>
      </div>
    </article>
  );
}
