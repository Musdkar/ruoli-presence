import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { getDisplayPresence } from "../lib/presence";
import { useT } from "../i18n";
import Sidebar from "../components/Sidebar.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import LangToggle from "../components/LangToggle.jsx";
import Home from "../pages/HomePage.jsx";

export default function Layout({ presence }) {
  const T = useT();
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const [hasVisitedHome, setHasVisitedHome] = useState(isHome);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (isHome) setHasVisitedHome(true);
  }, [isHome]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const displayPresence = getDisplayPresence(presence, now);
  return (
    <>
      <header>
        <Link className="brand" to="/">
          RUOLI<b>.</b>
        </Link>
        <nav>
          {[
            ["/", T.home],
            ["/blog", T.blog],
            ["/photo", T.photo],
            ["/uses", T.uses],
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
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
          {(isHome || hasVisitedHome) && (
            <Home presence={presence} displayPresence={displayPresence} active={isHome} now={now} />
          )}
          <Outlet />
        </section>
      </main>
    </>
  );
}
