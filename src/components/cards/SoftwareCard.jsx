import { useT } from "../../i18n";
import { formatUsageMinutes } from "../../lib/format";
import CardHead from "./CardHead.jsx";
import Empty from "./EmptyState.jsx";

export default function SoftwareCard({ apps }) {
  const T = useT();
  if (!apps?.length)
    return (
      <article className="card apps-card">
        <CardHead title={T.softwareToday} meta={T.foreground} />
        <Empty label={T.softwareNotLinked} detail={T.softwareNotLinkedDetail} />
      </article>
    );
  const top = apps.slice(0, 8);
  const max = Math.max(1, ...top.map((app) => app.minutes));
  return (
    <article className="card apps-card">
      <CardHead title={T.softwareToday} meta={T.foreground} />
      <div className="software-usage-list">
        {top.map((app, index) => (
          <div className="software-usage-row" key={app.name}>
            <div className="software-usage-name">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong title={app.name}>{app.name}</strong>
            </div>
            <div className="software-usage-track" aria-hidden="true">
              <i style={{ width: `${Math.max(4, (app.minutes / max) * 100)}%` }} />
            </div>
            <time>{formatUsageMinutes(app.minutes)}</time>
          </div>
        ))}
      </div>
    </article>
  );
}
