/**
 * Convert any path to POSIX format (forward slashes).
 * Strips leading ./ and normalizes // to /.
 *
 * @param path - File path (Windows or POSIX)
 * @returns POSIX normalized, repo-relative path
 */
export function toPosix(path: string): string {
  return path
    .replace(/\\/g, "/")      // backslash → forward slash
    .replace(/^\.\//, "")     // strip leading ./
    .replace(/\/+/g, "/");    // normalize multiple slashes → /
}
