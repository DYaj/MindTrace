import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

type AnyObj = Record<string, any>;

function readJson<T = AnyObj>(p: string): T {
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

function writeJson(p: string, obj: any) {
  writeFileSync(p, JSON.stringify(obj, null, 2), "utf-8");
}

function pickPageFile(entry: any): string | null {
  // Support multiple index formats
  const candidates = [
    entry?.file,
    entry?.path,
    entry?.json,
    entry?.pageFile,
    entry?.page_file
  ].filter((v) => typeof v === "string" && v.trim().length > 0) as string[];

  if (candidates.length > 0) return candidates[0];

  // ✅ Your index uses { pageId: "frameworks__...__LoginPage", ... }
  // Cache files are stored as "<pageId>.json"
  if (typeof entry?.pageId === "string" && entry.pageId.trim().length > 0) {
    return `${entry.pageId}.json`;
  }

  return null;
}

function getWrapperCounts(wrapperDiscovery: any) {
  // Support both shapes:
  // A) { wrappers: { locatorWrappers: [...], assertionWrappers: [...], retrySignals: [...] } }
  // B) { locatorWrappers: [...], assertionWrappers: [...], retrySignals: [...] }
  const w = wrapperDiscovery?.wrappers ?? wrapperDiscovery ?? {};
  return {
    locatorWrappers: Array.isArray(w.locatorWrappers) ? w.locatorWrappers.length : 0,
    assertionWrappers: Array.isArray(w.assertionWrappers) ? w.assertionWrappers.length : 0,
    retrySignals: Array.isArray(w.retrySignals) ? w.retrySignals.length : 0
  };
}

export function enrichPageCache(repoRoot: string) {
  const cacheDir = join(repoRoot, ".mcp-cache", "pages");
  const contractDir = join(repoRoot, ".mcp-contract");

  const pageIndexPath = join(cacheDir, "index.json");
  const summaryPath = join(cacheDir, "cache-summary.json");

  const wrapperPath = join(contractDir, "wrapper-discovery.json");
  const selectorStrategyPath = join(contractDir, "selector-strategy.json");
  const assertionStylePath = join(contractDir, "assertion-style.json");

  if (!existsSync(cacheDir) || !existsSync(pageIndexPath) || !existsSync(summaryPath)) {
    throw new Error("PAGE_CACHE_MISSING: run Phase 1 page cache generation first");
  }
  if (!existsSync(wrapperPath)) {
    throw new Error("WRAPPER_DISCOVERY_MISSING: run Phase 0.3 wrapper discovery first");
  }

  const pageIndex = readJson<any>(pageIndexPath);
  const cacheSummary = readJson<any>(summaryPath);

  const wrapper = readJson<any>(wrapperPath);
  const selectorStrategy = existsSync(selectorStrategyPath) ? readJson<any>(selectorStrategyPath) : null;
  const assertionStyle = existsSync(assertionStylePath) ? readJson<any>(assertionStylePath) : null;

  const selectorOrder: string[] =
    selectorStrategy?.strategy?.order && Array.isArray(selectorStrategy.strategy.order)
      ? selectorStrategy.strategy.order
      : [];

  const assertionSignals: string[] =
    assertionStyle?.style?.wrappers && Array.isArray(assertionStyle.style.wrappers)
      ? assertionStyle.style.wrappers
      : [];

  const pages: any[] = Array.isArray(pageIndex.pages) ? pageIndex.pages : [];

  let enriched = 0;
  const warnings: string[] = [];

  const wrapperCounts = getWrapperCounts(wrapper);

  for (const entry of pages) {
    const pageFile = pickPageFile(entry);
    if (!pageFile) {
      warnings.push(`ENRICH_SKIP_NO_PAGEFILE: ${JSON.stringify(entry).slice(0, 160)}`);
      continue;
    }

    // If pageFile is absolute, keep it absolute; else join cacheDir.
    const pagePath = pageFile.startsWith("/") ? pageFile : join(cacheDir, pageFile);

    if (!existsSync(pagePath)) {
      warnings.push(`ENRICH_SKIP_MISSING_FILE: ${pagePath}`);
      continue;
    }

    const pageObj = readJson<any>(pagePath);

    // Deterministic enrichment: contract selector order + wrapper counts (repo-only)
    const selectorHints = selectorOrder.length
      ? selectorOrder
      : ["data-testid", "data-qa", "data-cy", "role", "labelText", "placeholder", "css", "xpath"];

    const assertionHints = assertionSignals.length ? assertionSignals : ["expect(...)"];

    pageObj.wrapperSignals = wrapperCounts;
    pageObj.selectorHints = selectorHints;
    pageObj.assertionHints = assertionHints;

    writeJson(pagePath, pageObj);
    enriched += 1;
  }

  const enrichmentSummary = {
    schema_version: "0.1.0",
    generatedAt: new Date().toISOString(),
    repoRoot,
    pagesEnriched: enriched,
    pagesTotal: pages.length,
    selectorHintsSource: selectorOrder.length ? "selector-strategy.json" : "default",
    assertionHintsSource: assertionSignals.length ? "assertion-style.json" : "default",
    wrapperSignals: wrapperCounts,
    warnings
  };

  writeJson(join(cacheDir, "enrichment-summary.json"), enrichmentSummary);

  // Clean warnings deterministically
  const existingWarnings: string[] = Array.isArray(cacheSummary.warnings) ? cacheSummary.warnings : [];
  cacheSummary.warnings = existingWarnings
    .filter((w: string) => !String(w).startsWith("PAGE_CACHE_WRAPPER_ENRICHMENT"))
    .filter((w: string) => !String(w).startsWith("PAGE_CACHE_ENRICH_WARNINGS"));

  if (warnings.length > 0) {
    cacheSummary.warnings.push(`PAGE_CACHE_ENRICH_WARNINGS: count=${warnings.length}`);
  }
  writeJson(summaryPath, cacheSummary);

  return enrichmentSummary;
}
