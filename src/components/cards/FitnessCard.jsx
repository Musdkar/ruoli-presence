import { useT } from "../../i18n";
import { config } from "../../config";
import CardHead from "./CardHead.jsx";

export default function FitnessCard({ health }) {
  const T = useT();
  const steps = Math.max(0, Number(health?.steps || 0));
  const goal = Math.max(1, Number(config.fitness?.stepGoal || 8000));
  const progress = Math.min(1, steps / goal);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const synced = health != null;
  return (
    <article className="card fitness-card">
      <CardHead title={T.fitness} meta={synced ? T.stepsToday : T.notSynced} />
      <div className={`fitness-content${synced ? "" : " is-empty"}`}>
        <div
          className="fitness-ring-wrap"
          role="img"
          aria-label={`${steps.toLocaleString()} of ${goal.toLocaleString()} steps`}
        >
          <svg className="fitness-ring" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="fitness-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--violet)" />
                <stop offset="100%" stopColor="var(--mint)" />
              </linearGradient>
            </defs>
            <circle className="fitness-ring-track" cx="60" cy="60" r={radius} />
            <circle
              className="fitness-ring-progress"
              cx="60"
              cy="60"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ opacity: progress > 0 ? 1 : 0 }}
            />
          </svg>
        </div>
        <div className="fitness-steps">
          <span className="fitness-footsteps" aria-hidden="true">
            <i />
            <i />
            <b />
            <b />
          </span>
          <strong>{synced ? steps.toLocaleString() : "--"}</strong>
        </div>
      </div>
    </article>
  );
}
