import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getDisplayPresence } from "../lib/presence";
import { metadataFor, applyMetadata } from "../lib/seo";
import { posts } from "../content/posts";
import { useT } from "../i18n";
import Sidebar from "../components/Sidebar.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import LangToggle from "../components/LangToggle.jsx";

// Keep the document title/description/canonical/OG tags in step with the route.
function useRouteMetadata(pathname) {
  useEffect(() => {
    applyMetadata(metadataFor(pathname, { posts }));
  }, [pathname]);
}

export default function Layout({ presence }) {
  const T = useT();
  const { pathname } = useLocation();
  useRouteMetadata(pathname);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const displayPresence = getDisplayPresence(presence, now);
  return (
    <>
      <header>
        <a className="brand" href="/">
          RUOLI<b>.</b>
        </a>
        <nav>
          <a href="/">{T.home}</a>
          {[
            ["/blog", T.blog],
            ["/photo", T.photo],
            ["/uses", T.uses],
          ].map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <LangToggle />
        </div>
        <div className="edition">
          {T.edition}
          <br />
          {T.editionSub}
        </div>
      </header>
      <main>
        <Sidebar presence={presence} displayPresence={displayPresence} />
        <section className="content">
          <Outlet />
        </section>
      </main>
    </>
  );
}
