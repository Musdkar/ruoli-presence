// Connect rail glyphs, self-hosted as inline SVG.
//
// No icon library: these are four small paths copied into the tree so the rail
// has no runtime dependency and nothing is hotlinked from a third party.
//
// Sources, all official marks rather than approximations:
//
//   github    simple-icons `github`  (CC0) - the Octocat, filled
//   vrchat    the "VR" speech bubble    - see the note below
//   telegram  simple-icons `telegram` (CC0) - the paper plane, filled
//   mail      drawn here - envelope outline, to match the outline stroke
//
// The VRChat mark needs explaining. simple-icons' `vrchat` is the full
// "VRChat" wordmark, and at the 19px this rail renders it collapses into an
// illegible smear - every glyph merges. What reads at that size is the short
// mark: a speech bubble carrying just "VR", which is also what the reference
// design uses. That path is copied verbatim from the reference (viewBox
// 0 0 1024 1024), so the tile shows a real VRChat mark rather than a generic
// bubble with letters typed into it.
//
// Everything shares one 24-unit box and one stroke width, and filled marks are
// optically balanced against stroked ones by giving the filled paths a little
// more room, since a filled shape reads heavier than an outline of equal size.

const BOX = 24;

// Filled brand marks: single path, `fill`, no stroke.
function Filled({ path, viewBox, size = 18 }) {
  return (
    <svg
      className="social-svg"
      width={size}
      height={size}
      viewBox={viewBox || `0 0 ${BOX} ${BOX}`}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

// Stroked marks: `stroke` with no fill, so they match the envelope.
function Stroked({ children, size = 19 }) {
  return (
    <svg
      className="social-svg"
      width={size}
      height={size}
      viewBox={`0 0 ${BOX} ${BOX}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const GITHUB =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

const TELEGRAM =
  "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z";

const VRCHAT =
  "M106.38961 0h811.22078c51.332987 0 93.090909 41.624935 93.090909 93.090909v558.545455c0 51.332987-41.757922 93.090909-93.090909 93.090909h-13.298702v244.164156c0 25.001558-31.517922 36.172468-47.343376 16.756363L644.854026 744.727273H106.38961c-51.465974 0-93.090909-41.757922-93.090909-93.090909V93.090909c0-51.465974 41.624935-93.090909 93.090909-93.090909z m49.338182 161.712208q-12.89974 7.58026-15.825454 17.953247-0.930909 3.058701-0.930909 6.516363 0 1.196883 1.196883 6.383377l123.278961 401.487792q2.260779 6.516364 6.383376 11.56987 13.431688 16.623377 47.21039 16.623377 19.15013 0 34.443636-7.314286 12.101818-5.984416 17.022338-15.426493 1.32987-2.65974 2.127792-5.452468l122.614026-401.487792c0.797922-3.457662 1.196883-5.585455 1.196883-6.383377q0-2.393766-0.531948-4.787532-2.526753-11.037922-16.756363-19.416104-14.894545-8.91013-30.454026-10.107013-2.260779-0.132987-4.654546-0.132987-16.623377 0-23.671688 8.245195-3.058701 3.457662-4.388572 8.245194l-96.947532 346.032208-97.612468-346.032208q-1.32987-4.787532-4.388571-8.245194-7.181299-8.245195-23.671688-8.245195-5.319481 0-10.505974 0.797922-12.89974 1.994805-25.134546 9.176104z m382.869611 15.55948v414.919481q0 4.122597 1.462857 7.713247 2.792727 6.782338 11.037922 11.436883 12.367792 7.048312 28.858182 7.048311 17.421299 0 29.39013-7.048311 7.713247-4.521558 10.505974-11.170909 1.595844-3.723636 1.595844-7.979221V425.558442h53.593766l90.697143 176.207792q6.649351 12.89974 17.022337 17.421298 5.319481 2.260779 11.702858 2.26078 3.590649 0 7.181298-0.531948 14.628571-2.127792 27.927273-13.165715 14.628571-12.101818 16.357403-25.79948 0.265974-1.861818 0.265974-3.856624 0-6.383377-3.058702-10.24l-83.781818-155.062857q21.543896-6.516364 38.167273-19.416104 12.89974-9.974026 22.873766-23.937662 22.740779-31.916883 22.740779-84.313766 0-58.381299-28.991168-91.096104-37.236364-42.28987-122.348052-42.28987h-126.47065q-7.048312 0-12.633766 2.792727-3.457662 1.861818-6.516364 4.787533-4.388571 4.521558-6.250389 9.841039-1.32987 3.856623-1.32987 8.112207z m82.850909 183.123117h70.35013q34.443636 0 51.465974-17.155324 16.756364-17.022338 16.756363-50.535065 0-34.044675-17.022337-51.2-17.155325-17.022338-51.2-17.022338h-70.35013V360.394805z";

const ICONS = {
  github: () => <Filled path={GITHUB} size={18} />,
  // Slightly smaller than the rest: the bubble fills its box edge to edge, so
  // at an equal nominal size it would look heavier than the stroked marks.
  vrchat: () => <Filled path={VRCHAT} viewBox="0 0 1024 1024" size={20} />,
  telegram: () => <Filled path={TELEGRAM} size={18} />,
  mail: () => (
    <Stroked>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3 6.5 8.06 5.6a1.7 1.7 0 0 0 1.88 0L21 6.5" />
    </Stroked>
  ),
};

export function hasSocialIcon(icon) {
  return Boolean(ICONS[icon]);
}

export function socialIconKeys() {
  return Object.keys(ICONS);
}

export default function SocialIcon({ icon }) {
  const render = ICONS[icon];
  return render ? render() : null;
}
