import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

function readJsonSafe(p: string): any {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Phase 2: Seed healed-selectors.json from locator-manifest snapshot.
 * This gives deterministic "repo truth" selectors before runtime healing.
 */
export function seedHealedSelectorsFromManifest(opts: { cwd: string; runName: string }): boolean {
  const artifactsDir = join(opts.cwd, "runs", opts.runName, "artifacts");
  const healedPath = join(artifactsDir, "healed-selectors.json");

  // If already exists, do nothing (do not overwrite working logic)
  if (existsSync(healedPath)) return false;

  const manifestPath = process.env.MINDTRACE_LOCATOR_MANIFEST_PATH;
  if (!manifestPath || !existsSync(manifestPath)) {
    // create empty selectors to preserve downstream expectations
    writeFileSync(healedPath, JSON.stringify({ selectors: [] }, null, 2), "utf-8");
    return true;
  }

  const manifest = readJsonSafe(manifestPath);
  const locators = Array.isArray(manifest?.locators) ? manifest.locators : [];

  writeFileSync(healedPath, JSON.stringify({ selectors: locators }, null, 2), "utf-8");
  return true;
}
