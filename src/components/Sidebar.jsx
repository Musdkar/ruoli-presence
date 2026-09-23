import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { config } from "../config";
import { useT } from "../i18n";
import VrcStatus from "./VrcStatus.jsx";
import SocialIcon from "./SocialIcon.jsx";

export default function Sidebar({ presence, displayPresence }) {
  const T = useT();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const local = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: config.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now),
    [now]
  );
  return (
    <aside>
      <div className="sidebar">
        <div className="sidebar-top">
          <div className="kicker">{T.aboutMe}</div>
          <span className="sidebar-motto">
            mostly
            <br />
            <i>online.</i>
          </span>
        </div>
        <div className="identity">
          {/* The visible <h1> right next to it already names the owner, so the
              avatar is decorative and gets an empty alt. */}
          <img
            className="avatar"
            src={config.avatar}
            alt=""
            width="78"
            height="78"
            fetchPriority="high"
            decoding="async"
          />
          <div>
            <h1>
              {config.name}
              <br />
              <i>{config.nameJa}</i>
            </h1>
            <p>
              {config.greeting} I&apos;m {config.name}. {T.about}
            </p>
          </div>
        </div>
        <div className="rule" />
        <div className="fun-facts">
          <div className="fun-facts-title">{T.funFacts}</div>
          <ul>
            {T.funFactsItems.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
        <dl>
          <div>
            <dt>{T.localTime}</dt>
            <dd>{local}</dd>
          </div>
          <div>
            <dt>{T.presence}</dt>
            <dd className={`sidebar-presence ${displayPresence.status}`}>
              ● {(displayPresence.labelKey && T[displayPresence.labelKey]) || displayPresence.label}
            </dd>
          </div>
        </dl>
        <VrcStatus presence={presence} />
        <div className="social-block">
          <div className="social-title">{T.connect}</div>
          <div className="socials">
            {config.socialLinks.map((link) => {
              // Icon in a circle, service name underneath. The whole thing is
              // one hit target, so the label is inside the link rather than a
              // separate row.
              const inner = (
                <>
                  {/* A div, not a span: the legacy `.socials span` rules in
                      styles.css/tweaks.css target the old text chips and would
                      strip this element's border and size. */}
                  <div className="social-ring">
                    <SocialIcon icon={link.icon} />
                  </div>
                  <span className="social-name">{link.name}</span>
                </>
              );
              return link.href ? (
                // A path that starts with "/" is an in-app route: navigate with
                // <Link> so it stays a client-side transition and does not open
                // a new tab. Anything else is an external link.
                link.href.startsWith("/") ? (
                  <Link key={link.label} to={link.href} aria-label={link.name}>
                    {inner}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={link.name}
                  >
                    {inner}
                  </a>
                )
              ) : (
                <span
                  key={link.label}
                  className="disabled"
                  aria-label={link.name + " " + T.notLinked}
                >
                  {inner}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
