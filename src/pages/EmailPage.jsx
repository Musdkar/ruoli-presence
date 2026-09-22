import { useEffect } from "react";
import { Link } from "react-router-dom";
import { metadataFor, applyMetadata } from "../lib/seo";

// Contact address, kept Base64-encoded so it is not sitting in the page source
// as plain text.
//
// This route renders outside Layout on purpose: no header, nav or sidebar, so
// opening /email reads as a different surface rather than another view of the
// site. Because it is outside Layout it applies its own document metadata. Only
// one heading is shown, so it uses a plain <h2> and does not pull in the
// markdown renderer for a single line.
export default function EmailPage() {
  useEffect(() => {
    applyMetadata(metadataFor("/email"));
  }, []);

  return (
    <div className="email-page">
      <Link className="email-back" to="/" aria-label="Back to home">
        ←
      </Link>
      <h2 className="email-address">Y29udGFjdEBrYWxpZXJpLmNvbQ==</h2>
    </div>
  );
}
