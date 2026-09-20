// Build-output allowlist, shared by the Vite buildGuard.
//
// Internal artifact paths are always compared as POSIX-style relative paths
// (forward slashes) so the guard behaves identically on macOS, Linux and
// Windows. Windows would otherwise produce backslash-joined paths that never
// match the forward-slash prefixes below.

export const ALLOWED_PREFIXES = ["index.html", "assets/", "staticwebapp.config.json"];

// Convert a platform path fragment to a POSIX-style relative path.
export function normalizeBuildPath(value) {
  return String(value).split("\\").join("/");
}

// True when a relative artifact path is one this SPA is allowed to ship.
export function isAllowedBuildArtifact(relPath) {
  const rel = normalizeBuildPath(relPath);
  return ALLOWED_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? rel.startsWith(prefix) : rel === prefix
  );
}

// True when a directory path is a prefix of an allowed directory prefix
// (e.g. "assets" or "assets/foo" stay, so nested assets are walked).
export function isAllowedBuildDirectory(relPath) {
  const rel = normalizeBuildPath(relPath).replace(/\/$/, "");
  return ALLOWED_PREFIXES.some(
    (prefix) =>
      prefix.endsWith("/") &&
      (prefix.slice(0, -1) === rel || rel.startsWith(prefix)) &&
      rel.length > 0
  );
}
