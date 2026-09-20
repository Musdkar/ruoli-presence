import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { config } from "./config";
import { posts } from "./content/posts";
import { getDisplayPresence } from "./lib/presence";
import {
  normalizeApps,
  normalizeHealth,
  normalizeKeyboard,
  resolveMusic,
  mergeAppUsage,
} from "./lib/normalize";
import { useLang, setLang, getLang, LANGS, useT, LangContext, LANG_CHOSEN_KEY } from "./i18n";
import { KEYBOARD_MAC, KEYBOARD_WIN_87 } from "./data/keyboardLayouts";
import CardHead from "./components/cards/CardHead.jsx";
import Empty from "./components/cards/EmptyState.jsx";
import StatusCard from "./components/cards/StatusCard.jsx";
import WeatherCard from "./components/cards/WeatherCard.jsx";
import MapCard from "./components/cards/MapCard.jsx";
import MusicCard from "./components/cards/MusicCard.jsx";
import HomePhotoCard from "./components/cards/HomePhotoCard.jsx";
import FitnessCard from "./components/cards/FitnessCard.jsx";
import DevicesCard from "./components/cards/DevicesCard.jsx";
import SoftwareCard from "./components/cards/SoftwareCard.jsx";
import KeyboardCard from "./components/cards/KeyboardCard.jsx";
import VrcStatus from "./components/VrcStatus.jsx";
import { useResolvedTheme } from "./hooks/useResolvedTheme";
import { useFastLanyard } from "./hooks/useFastLanyard";
import ThemeToggle from "./components/ThemeToggle.jsx";
import LangToggle from "./components/LangToggle.jsx";
import LangPicker from "./components/LangPicker.jsx";
import BrandMark from "./components/BrandMark.jsx";
import "./styles.css";
import "./hotfix.css";
import "./theme.css";

const LazyMasonryPhotoAlbum = React.lazy(async () => {
  await import("react-photo-album/masonry.css");
  const mod = await import("react-photo-album");
  return { default: mod.MasonryPhotoAlbum };
});
const LazyMarkdown = React.lazy(async () => {
  const [{ default: Markdown }, { default: gfm }] = await Promise.all([
    import("react-markdown"),
    import("remark-gfm"),
  ]);
  return {
    default: function MarkdownRenderer({ children }) {
      return <Markdown remarkPlugins={[gfm]}>{children}</Markdown>;
    },
  };
});

function Sidebar({ presence, displayPresence }) {
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
          <img
            className="avatar"
            src={config.avatar}
            alt="avatar"
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
              {config.greeting} I&apos;m {config.name}. {config.about}
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
            {config.socialLinks.map((link) =>
              link.href ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  title={link.name}
                >
                  {link.label}
                </a>
              ) : (
                <span key={link.label} className="disabled" title={link.name + " " + T.notLinked}>
                  {link.label}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function Layout({ presence }) {
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

function Home({ presence, displayPresence, active, now }) {
  const kv = presence && presence.kv ? presence.kv : {};
  // Software usage combines every device so the list can show more rows.
  const apps = mergeAppUsage(
    normalizeApps(kv.apps_today_mac || kv.apps_today),
    normalizeApps(kv.apps_today_win)
  );
  const health = normalizeHealth(kv.health_today);
  // Keyboards are per device and never merged.
  const keyboardMac = normalizeKeyboard(
    kv.keyboard_today_mac || kv.keyboard_today || kv.keyboard_yesterday
  );
  const keyboardWin = normalizeKeyboard(kv.keyboard_today_win);
  const music = resolveMusic(kv.music_now, presence && presence.spotify, now);
  return (
    <div className="view home-view" hidden={!active}>
      <div className="grid">
        <StatusCard displayPresence={displayPresence} />
        <WeatherCard />
        <MapCard active={active} />
        <MusicCard music={music} />
        <HomePhotoCard />
        <FitnessCard health={health} />
        <DevicesCard />
        <SoftwareCard apps={apps} />
        <KeyboardCard
          keyboard={keyboardMac}
          layout={KEYBOARD_MAC}
          device="mac"
          title="Keyboard · Mac"
          note="Run bridge/whatpulse_presence.py on the Mac to publish a privacy-filtered keyboard aggregate."
        />
        <KeyboardCard
          keyboard={keyboardWin}
          layout={KEYBOARD_WIN_87}
          device="win"
          title="Keyboard · Windows"
          note="Run the Windows bridge (DEVICE=win) to publish a privacy-filtered keyboard aggregate."
        />
      </div>
    </div>
  );
}

function PhotoPage() {
  const T = useT();
  return (
    <div className="view page-view photo-page">
      <div className="page-mast">
        <div>
          <span className="eyebrow">{T.photo} / ARCHIVE</span>
          <h2>
            {T.homePageTitle1}
            <br />
            {T.homePageTitle2}
          </h2>
        </div>
        <p>{T.photoIntro}</p>
      </div>
      <div className="page-rule" />
      <div className="photo-wall">
        <React.Suspense fallback={<div className="archive-note">{T.loadingArchive}</div>}>
          <LazyMasonryPhotoAlbum
            photos={config.photos}
            columns={(width) => (width < 700 ? 1 : width < 1200 ? 2 : 3)}
            spacing={10}
          />
        </React.Suspense>
      </div>
      {config.photos.length === 1 && <div className="archive-note">{T.archiveNote}</div>}
    </div>
  );
}

const publishedPosts = posts.filter((post) => post.published !== false);
function BlogPage() {
  const T = useT();
  return (
    <div className="view page-view blog-page">
      <div className="page-mast">
        <div>
          <span className="eyebrow">{T.blogEyebrow}</span>
          <h2>
            {T.blogTitle1}
            <br />
            {T.blogTitle2}
          </h2>
        </div>
        <p>{T.blogIntro}</p>
      </div>
      <div className="page-rule" />
      {publishedPosts.length ? (
        <div className="post-list">
          {publishedPosts.map((post, index) => (
            <Link className="post-row" to={`/blog/${post.slug}`} key={post.slug}>
              <span className="post-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <div className="post-tags">
                  {post.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <time>{post.date}</time>
            </Link>
          ))}
        </div>
      ) : (
        <div className="blog-empty">
          <span>ISSUE 00</span>
          <h3>{T.noPosts}</h3>
          <p>{T.noPostsDetail}</p>
        </div>
      )}
    </div>
  );
}

function BlogPost() {
  const T = useT();
  const { slug } = useParams();
  const post = posts.find((item) => item.slug === slug && item.published !== false);
  if (!post)
    return (
      <div className="view page-view">
        <div className="blog-empty">
          <span>404</span>
          <h3>Post not found.</h3>
          <Link to="/blog">← back to blog</Link>
        </div>
      </div>
    );
  return (
    <article className="view article-view">
      <Link className="back-link" to="/blog">
        ← {T.blog}
      </Link>
      <header className="article-head">
        <time>{post.date}</time>
        <h2>{post.title}</h2>
        <p>{post.summary}</p>
      </header>
      <div className="article-body">
        <React.Suspense fallback={<p>{T.loadingArticle}</p>}>
          <LazyMarkdown>{post.body}</LazyMarkdown>
        </React.Suspense>
      </div>
    </article>
  );
}

function UsesPage() {
  const T = useT();
  return (
    <div className="view page-view uses-page">
      <div className="page-mast">
        <div>
          <span className="eyebrow">{T.usesEyebrow}</span>
          <h2>
            {T.usesTitle1}
            <br />
            {T.usesTitle2}
          </h2>
        </div>
        <p>{T.usesIntro}</p>
      </div>
      <div className="page-rule" />
      <div className="uses-grid">
        {config.software.map((group) => (
          <section className="uses-group" key={group.group}>
            <div className="uses-group-head">
              <h3>{T.groups[group.group] || group.group}</h3>
              <span>{T.groupNotes[group.note] || group.note}</span>
            </div>
            <div className="software-list">
              {group.items.map((item) => (
                <div className="software-item" key={item.name}>
                  <div className="software-icon">
                    <BrandMark item={item} />
                    {item.icon && (
                      <span className="brand-fallback">
                        {item.monogram || item.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <b>{item.name}</b>
                    <span>{item.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="uses-foot">
        <span>{T.usesFoot1}</span>
        <span>{T.usesFoot2}</span>
      </div>
    </div>
  );
}

function SiteRouter({ presence }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout presence={presence} />}>
          <Route index element={null} />
          <Route path="photo" element={<PhotoPage />} />
          <Route path="photos" element={<Navigate to="/photo" replace />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="uses" element={<UsesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
function LanyardApp() {
  const presence = useFastLanyard(config.discordId);
  return <SiteRouter presence={presence} />;
}
function App() {
  const lang = useLang();
  const [asking, setAsking] = useState(() => {
    try {
      return localStorage.getItem(LANG_CHOSEN_KEY) !== "1";
    } catch (e) {
      return true;
    }
  });
  const choose = (l) => {
    setLang(l);
    setAsking(false);
    try {
      localStorage.setItem(LANG_CHOSEN_KEY, "1");
    } catch (e) {}
  };
  const content = config.discordId ? <LanyardApp /> : <SiteRouter presence={null} />;
  return (
    <LangContext.Provider value={lang}>
      {asking && <LangPicker onChoose={choose} />}
      {content}
    </LangContext.Provider>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
