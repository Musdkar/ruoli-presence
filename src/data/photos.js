// The photo archive.
//
// Every entry is one file in `public/assets/photos/`, named after the moment it
// was taken (`YYYY-MM-DD-HHMMSS`), so the folder sorts chronologically on disk
// and a new frame only needs to be appended here.
//
// `taken` drives the visible date label and is the single source of truth for
// ordering. `file` is a basename, never a path: `src` and `fileName` below
// derive the rest, so a file can only ever be addressed inside the archive.
//
// `width`/`height` are the intrinsic pixel size of the shipped WebP. React
// Photo Album needs them up front to reserve space and lay out the masonry
// without waiting for the images to download, so they must match the files.
export const photos = [
  {
    file: "2026-02-11-215858",
    taken: "2026-02-11T21:58:58",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-02-13-105542",
    taken: "2026-02-13T10:55:42",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-02-13-105559",
    taken: "2026-02-13T10:55:59",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-02-13-110049",
    taken: "2026-02-13T11:00:49",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-02-16-233419",
    taken: "2026-02-16T23:34:19",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-02-16-233527",
    taken: "2026-02-16T23:35:27",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-02-17-092405",
    taken: "2026-02-17T09:24:05",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-02-20-193440",
    taken: "2026-02-20T19:34:40",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-02-21-091425",
    taken: "2026-02-21T09:14:25",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-02-24-174210",
    taken: "2026-02-24T17:42:10",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-03-23-201936",
    taken: "2026-03-23T20:19:36",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    // Home card cover. Pinned by name rather than left to "the newest frame":
    // the card is a deliberate choice, and adding a later photo should not
    // silently swap it out.
    file: "2026-08-21-230444",
    taken: "2026-08-21T23:04:44",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
    featured: true,
  },
  {
    file: "2026-08-21-231339",
    taken: "2026-08-21T23:13:39",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-08-22-000356",
    taken: "2026-08-22T00:03:56",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-08-30-014213",
    taken: "2026-08-30T01:42:13",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-09-02-203912",
    taken: "2026-09-02T20:39:12",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
  {
    // Portrait capture: 2160x3840 at the source, so the resize cap lands on
    // the height. Photo Album reads these dimensions, so they must stay
    // portrait here or the tile is laid out with the wrong aspect ratio.
    file: "2026-09-06-022351",
    taken: "2026-09-06T02:23:51",
    width: 900,
    height: 1600,
    alt: "VRChat screenshot",
  },
  {
    file: "2026-09-14-001659",
    taken: "2026-09-14T00:16:59",
    width: 1600,
    height: 900,
    alt: "VRChat screenshot",
  },
];

// Shipped basename of one archive frame, e.g. "2026-02-11-215858.webp".
export function photoFileName(photo) {
  return photo.file + ".webp";
}

// Public URL of one archive frame.
export function photoSrc(photo) {
  return "/assets/photos/" + photoFileName(photo);
}
