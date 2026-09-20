import { Link } from "react-router-dom";
import { useT } from "../i18n";

// Unknown URLs render an explicit not-found view instead of silently redirecting
// to Home, so a mistyped route stays visible rather than looking like success.
export default function NotFoundPage() {
  const T = useT();
  return (
    <div className="view page-view">
      <div className="blog-empty">
        <span>404</span>
        <h3>Page not found.</h3>
        <p>{T.noPostsDetail}</p>
        <Link to="/">← ruoli</Link>
      </div>
    </div>
  );
}
