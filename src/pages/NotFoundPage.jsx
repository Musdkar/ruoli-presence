import { Link } from "react-router-dom";
import { useT } from "../i18n";

// Unknown URLs render an explicit not-found view instead of silently redirecting
// to Home, so a mistyped route stays visible rather than looking like success.
// Note: this is a client-side view. In a SPA-fallback host the HTTP status may
// still be 200, so this is not a true HTTP 404 (that needs SSR/prerender).
export default function NotFoundPage() {
  const T = useT();
  return (
    <div className="view page-view">
      <div className="blog-empty">
        <span>404</span>
        <h3>{T.notFoundTitle}</h3>
        <p>{T.notFoundBody}</p>
        <Link to="/">← {T.backHome}</Link>
      </div>
    </div>
  );
}
