// Brand glyphs for the Connect rail.
//
// Rendered with `lucide-react` rather than hand-copied path data. An earlier
// pass drew these by hand and produced marks that were merely plausible - a
// generic headset for VRChat, an envelope that matched nothing - which is
// exactly the failure mode copy-pasted path strings invite. Using the library
// components means the geometry is whatever the icon set actually ships.
//
// Pinned to lucide 0.577, the last 0.x: v1 removed every brand logo including
// `Github`, which the reference design relies on. Staying on 0.x keeps the real
// Octocat mark rather than a stand-in.
//
// Lucide has no VRChat mark at any version, so its tile is a speech bubble with
// "VR" set inside. VRChat's actual wordmark is a bubble, but the lettering is
// illegible at 19px - which is what made the previous attempt unreadable - so
// the initials stand in for it.
//
// Every icon renders through the same component so stroke width, caps and
// joins stay identical across the row.

import { Github, Mail, MessageSquare, Send } from "lucide-react";

const ICONS = {
  github: Github,
  vrchat: MessageSquare,
  telegram: Send,
  mail: Mail,
};

// VRChat's tile is a chat bubble with "VR" inside rather than a bare bubble:
// the wordmark is unreadable at this size, the initials are not.
const BADGES = { vrchat: "VR" };

export function hasSocialIcon(icon) {
  return Boolean(ICONS[icon]);
}

// Exposed for the test suite, which asserts every icon key resolves.
export function socialIconKeys() {
  return Object.keys(ICONS);
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
