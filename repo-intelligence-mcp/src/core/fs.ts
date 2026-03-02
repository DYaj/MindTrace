import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

export type IgnoreConfig = {
  useDefault?: boolean; // default true
  patterns?: string[]; // additional simple patterns
};

const DEFAULT_IGNORES = ["node_modules/", "dist/", "build/", ".git/", ".next/", "out/", "runs/", "history/", "test-results/", "playwright-report/", "reports/"];

/**
 * Normalize path separators to POSIX.
 */
export function toPosixPath(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Very strict + simple ignore:
 * - directory prefix ignores (e.g. "node_modules/")
 * - substring ignore for provided patterns (kept simple on purpose for determinism)
 *
 * NOTE: Phase 0 determinism > fancy globbing.
 */
export function shouldIgnore(relPosixPath: string, ignore?: IgnoreConfig): boolean {
  const useDefault = ignore?.useDefault !== false;
  const patterns = [...(useDefault ? DEFAULT_IGNORES : []), ...(ignore?.patterns ?? []).map(toPosixPath)];

  const p = relPosixPath.startsWith("./") ? relPosixPath.slice(2) : relPosixPath;

  for (const pat of patterns) {
    if (!pat) continue;

    // Treat "dir/" as prefix-anywhere folder segment ignore
    if (pat.endsWith("/")) {
      const seg = pat;
      if (p === seg.slice(0, -1) || p.startsWith(seg) || p.includes("/" + seg)) return true;
      continue;
    }

    // Fallback: substring match
    if (p.includes(pat)) return true;
  }

  // Common binary/archive filters
  if (/\.(zip|tgz|gz|7z|rar|pdf|png|jpg|jpeg|webp|mp4|mov|mxf)$/i.test(p)) return true;

  return false;
}

/**
 * Deterministically list files under rootDir.
 * - stable sort (posix paths)
 * - strict ignores
 */
export function listFilesDeterministic(opts: { rootDir: string; ignore?: IgnoreConfig; maxFiles?: number }): string[] {
  const out: string[] = [];
  const maxFiles = opts.maxFiles ?? 20000;

  const walk = (absDir: string, relDir: string) => {
    if (out.length >= maxFiles) return;

    const entries = readdirSync(absDir, { withFileTypes: true })
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b)); // stable

    for (const name of entries) {
      if (out.length >= maxFiles) break;

      const abs = join(absDir, name);
      const rel = relDir ? `${relDir}/${name}` : name;
      const relPosix = toPosixPath(rel);

      if (shouldIgnore(relPosix, opts.ignore)) continue;

      const st = statSync(abs);
      if (st.isDirectory()) {
        walk(abs, rel);
      } else if (st.isFile()) {
        out.push(relPosix);
      }
    }
  };

  walk(opts.rootDir, "");
  return out.sort((a, b) => a.localeCompare(b));
}

/**
 * Read text safely:
 * - size cap (default 512KB)
 * - returns null for likely-binary
 */
export function readTextSafe(absPath: string, sizeCapBytes = 512 * 1024): string | null {
  try {
    const st = statSync(absPath);
    if (!st.isFile()) return null;
    if (st.size > sizeCapBytes) return null;

    const buf = readFileSync(absPath);

    // Binary-ish heuristic: many NUL bytes
    let nul = 0;
    for (let i = 0; i < buf.length; i++) if (buf[i] === 0) nul++;
    if (nul > 0) return null;

    return buf.toString("utf-8");
  } catch {
    return null;
  }
}
