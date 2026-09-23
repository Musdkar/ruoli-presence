// Brand glyphs for the Connect rail.
//
// Inline SVG rather than files under public/assets: these are four small
// monochrome paths, and inlining costs a few hundred bytes in a chunk that is
// already loaded. Shipping them as images would add four requests and a flash
// of empty boxes for no benefit.
//
// Every mark is drawn on a 24x24 viewBox and inherits `currentColor`, so the
// existing .socials hover and .disabled rules keep working untouched.

const PATHS = {
  github:
    "M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z",
  vrchat:
    "M2.5 3h19A2.5 2.5 0 0 1 24 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-4.9l1.9 4.4a.6.6 0 0 1-.78.79L11.4 19.6a2.5 2.5 0 0 1-2.1 0L3.02 22.2a.6.6 0 0 1-.79-.79L4.13 17H2.5A2.5 2.5 0 0 1 0 14.5v-9A2.5 2.5 0 0 1 2.5 3Zm3.2 4.1a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm12.6 0a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z",
  telegram:
    "M23.91 3.79 20.3 20.84c-.25 1.21-.98 1.5-1.99.94l-5.5-4.07-2.66 2.57c-.3.3-.55.56-1.13.56-.73 0-.6-.28-.85-1l-2.02-6.65L1.65 10.3c-1.24-.4-1.27-1.24.26-1.84l18.13-7c1.03-.39 1.94.25 1.6 1.53",
  mail: "M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13Zm2.2.5 7.8 5.55L19.8 6H4.2Z",
};

export function hasSocialIcon(icon) {
  return Boolean(PATHS[icon]);
}

export default function SocialIcon({ icon }) {
  const path = PATHS[icon];
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}
