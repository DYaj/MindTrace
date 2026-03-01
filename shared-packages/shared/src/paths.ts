import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Resolve the package root (works from dist/* or src/*).
 * Example: dist/mcp/server.js -> dist/mcp -> dist -> (package root)
 */
export function resolvePackageRoot(importMetaUrl: string): string {
  const here = dirname(fileURLToPath(importMetaUrl));
  return resolve(here, "../..");
}

/**
 * Resolve a base path from env var (preferred) otherwise fall back to package root.
 * This is how you make "packaged prompts/contracts" work reliably.
 */
export function resolveBasePath(opts: { envVar: string; importMetaUrl: string }): string {
  const envPath = process.env[opts.envVar];
  if (envPath && existsSync(envPath)) return envPath;
  return resolvePackageRoot(opts.importMetaUrl);
}
