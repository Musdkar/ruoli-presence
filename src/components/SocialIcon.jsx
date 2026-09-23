// Service glyphs for the Connect tiles.
//
// Layout is unchanged: the rail is still the four rounded tiles it has always
// been. Only the contents change - the two-letter label inside each tile is
// replaced by that service's icon.
//
// Rendered from `lucide-react` components rather than copied path data, so the
// geometry is whatever the icon set ships. Pinned to lucide 0.577: v1 removed
// every brand logo including `Github`, and the real Octocat needs 0.x.
//
// Lucide has no VRChat mark at any version, so that tile is a speech bubble
// with "VR" set inside - VRChat's own wordmark is a bubble, but its lettering
// is illegible at 19px, and the initials are not.

import { Github, Mail, MessageSquare, Send } from "lucide-react";

const ICONS = {
  github: Github,
  vrchat: MessageSquare,
  telegram: Send,
  mail: Mail,
};

// Drawn inside the glyph rather than beside it.
const BADGES = { vrchat: "VR" };

export function hasSocialIcon(icon) {
  return Boolean(ICONS[icon]);
}

export default function SocialIcon({ icon }) {
  const Icon = ICONS[icon];
  if (!Icon) return null;

  const badge = BADGES[icon];

  return (
    <span className="social-glyph">
      <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
      {badge && (
        <i className="social-glyph-badge" aria-hidden="true">
          {badge}
        </i>
      )}
    </span>
  );
}
