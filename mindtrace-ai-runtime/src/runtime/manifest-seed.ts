import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { ensureRunLayout } from "./pipeline";
import { loadAndValidateLocatorManifest, LocatorManifest } from "./contract-loader";

/**
 * Phase 2: Seed healed-selectors.json from locator-manifest snapshot.
 *
 * Contract source of truth:
 * - snapshot path: runs/<runName>/artifacts/locator-manifest.snapshot.json (preferred)
 * - fallback: contracts/examples/locator-manifest.json
 *
 * Output:
 * - runs/<runName>/artifacts/healed-selectors.json
 *
 * NOTE: We intentionally keep the output "selectors" shape simple and
 * deterministic for now. It is a seed input to the healing layer,
 * not the final self-heal runtime log.
 */

type HealedSelectorSeed = {
  selectors: Array<{
    element_id: string;
    strategy: string;
    value: string;
  }>;
  source: "snapshot" | "repo";
  timestamp: string;
};

function readJsonSafe(p: string): any {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function flattenManifest(manifest: LocatorManifest): HealedSelectorSeed["selectors"] {
  const out: HealedSelectorSeed["selectors"] = [];

  for (const el of manifest.elements || []) {
    const element_id = el.element_id;

    for (const loc of el.locators || []) {
      out.push({
        element_id,
        strategy: loc.strategy,
        value: loc.value,
      });
    }
  }

  return out;
}

export function seedHealedSelectorsFromManifest(ctx: { cwd: string; runName: string }): void {
  const layout = ensureRunLayout({ cwd: ctx.cwd, runName: ctx.runName });
  mkdirSync(layout.artifactsDir, { recursive: true });

  const healedPath = join(layout.artifactsDir, "healed-selectors.json");

  // Prefer the immutable-ish snapshot captured by CLI during this run.
  const snapshotPath =
    process.env.MINDTRACE_LOCATOR_MANIFEST_PATH ||
    join(layout.artifactsDir, "locator-manifest.snapshot.json");

  // 1) Snapshot path (preferred)
  if (existsSync(snapshotPath)) {
    const raw = readJsonSafe(snapshotPath);
    if (raw && typeof raw === "object") {
      const selectors = flattenManifest(raw as LocatorManifest);

      const seed: HealedSelectorSeed = {
        selectors,
        source: "snapshot",
        timestamp: new Date().toISOString(),
      };

      writeFileSync(healedPath, JSON.stringify(seed, null, 2), "utf-8");
      return;
    }
  }

  // 2) Repo manifest fallback (contracts/examples)
  const repoManifest = loadAndValidateLocatorManifest(ctx.cwd);
  if (repoManifest) {
    const selectors = flattenManifest(repoManifest);

    const seed: HealedSelectorSeed = {
      selectors,
      source: "repo",
      timestamp: new Date().toISOString(),
    };

    writeFileSync(healedPath, JSON.stringify(seed, null, 2), "utf-8");
    return;
  }

  // 3) No manifest available: deterministic empty seed
  const seed: HealedSelectorSeed = {
    selectors: [],
    source: "repo",
    timestamp: new Date().toISOString(),
  };

  writeFileSync(healedPath, JSON.stringify(seed, null, 2), "utf-8");
}
