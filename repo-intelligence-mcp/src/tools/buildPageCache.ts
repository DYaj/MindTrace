import fs from "node:fs/promises";
import path from "node:path";
import type { AutomationContract, PageKeyPolicy } from "../types/contract.js";
import type { PageCacheIndex, PageSemanticCacheEntry } from "../types/pageCache.js";

/**
 * CRITICAL BOUNDARY ENFORCEMENT:
 * buildPageCache is STRICTLY contract-derived.
 *
 * Input: automationContract, pageKeyPolicy, contractSha256, outputDir
 * NO RepoTopologyJSON access
 * NO filesystem reads (except writing cache)
 * NO timestamps (determinism requirement)
 *
 * Every cache entry includes contractSha256 for drift detection.
 */

export type BuildPageCacheParams = {
  automationContract: AutomationContract;
  pageKeyPolicy: PageKeyPolicy;
  contractSha256: string;
  outputDir: string;
};

export type BuildPageCacheResult =
  | { ok: true; pagesWritten: number }
  | { ok: false; error: string };

function slugFromPath(relPosix: string): string {
  const noExt = relPosix.replace(/\.[^.]+$/, "");
  return noExt.replace(/[\/]/g, "__").replace(/[^A-Za-z0-9_\-]+/g, "_");
}

function inferredNameFromPath(relPosix: string): string {
  const base = relPosix.split("/").pop() || relPosix;
  return base.replace(/\.[^.]+$/, "");
}

/**
 * Build page cache strictly from contract bundle (NO raw repo access).
 *
 * BOUNDARY ENFORCEMENT: This function MUST NOT accept RepoTopologyJSON.
 * Cache is purely contract-derived for determinism.
 */
export async function buildPageCache(
  params: BuildPageCacheParams
): Promise<BuildPageCacheResult> {
  try {
    const { automationContract, pageKeyPolicy, contractSha256, outputDir } = params;

    // Extract page paths from contract
    const pagePaths: string[] = [];

    // Contract may store page paths in different locations
    if (automationContract.paths && typeof automationContract.paths === "object") {
      const paths = automationContract.paths as Record<string, unknown>;

      if (Array.isArray(paths.pages)) {
        pagePaths.push(...paths.pages.filter(p => typeof p === "string"));
      }

      if (Array.isArray(paths.pageObjects)) {
        pagePaths.push(...paths.pageObjects.filter(p => typeof p === "string"));
      }
    }

    // Also extract from entrypoints if they reference page files
    for (const entry of automationContract.entrypoints || []) {
      if (entry.entrypoint && typeof entry.entrypoint === "string") {
        // Only include if it looks like a page file (not a test)
        const lower = entry.entrypoint.toLowerCase();
        if (lower.includes("page") || lower.includes("/pages/")) {
          pagePaths.push(entry.entrypoint);
        }
      }
    }

    // Deduplicate and sort for determinism
    const uniquePagePaths = Array.from(new Set(pagePaths)).sort((a, b) => a.localeCompare(b));

    // Build cache entries from contract data only
    const pages: PageSemanticCacheEntry[] = [];

    for (const relPosix of uniquePagePaths) {
      const pageId = slugFromPath(relPosix);
      const inferredName = inferredNameFromPath(relPosix);

      // Build minimal cache entry from contract metadata
      // NOTE: In Phase 1, we only have path info from contract
      // Future phases may include richer metadata in contract
      const entry: PageSemanticCacheEntry = {
        cacheVersion: "0.1.0",
        pageId,
        sourcePath: relPosix,
        inferredName,
        contractSha256, // ✅ CRITICAL: Link every entry to contract for drift detection
        routes: [],
        stableIds: [],
        roles: [],
        labels: [],
        placeholders: [],
        anchors: [],
        interactionTargets: [],
        confidence: 0.5, // Base confidence for contract-declared pages
        warnings: []
      };

      pages.push(entry);
    }

    // Write cache to CANONICAL structure: outputDir/v1/pages/
    const v1Dir = path.join(outputDir, "v1");
    const pagesDir = path.join(v1Dir, "pages");
    await fs.mkdir(pagesDir, { recursive: true });

    // Write individual page cache files to canonical location
    for (const page of pages) {
      const pagePath = path.join(pagesDir, `${page.pageId}.json`);
      await fs.writeFile(pagePath, JSON.stringify(page, null, 2));
    }

    // ============================================================================
    // CANONICAL META.JSON - Official BreakLine Cache Metadata Standard
    // ============================================================================
    // ARCHITECTURE: Write strictly - emit ONLY canonical field names
    // See: docs/standards/cache-metadata-schema.md
    //
    // REQUIRED FIELDS (exact names, exact casing):
    //   - schemaVersion (schema evolution)
    //   - cacheVersion (cache format version)
    //   - contractSha256 (contract binding)
    //   - pages_count (explicit count)
    //
    // OPTIONAL FIELDS:
    //   - pages (page summaries)
    //   - cache_format (internal format identifier)
    //   - generated_by (provenance)
    //
    // DO NOT emit legacy field names (contractBinding, contract_hash, etc.)
    // ============================================================================
    const meta = {
      // Required canonical fields
      schemaVersion: "1.0.0",
      cacheVersion: "v1",
      contractSha256,
      pages_count: pages.length,

      // Optional canonical fields
      pages: pages.map(p => ({
        pageId: p.pageId,
        sourcePath: p.sourcePath,
        inferredName: p.inferredName,
        confidence: p.confidence
      })),
      cache_format: "semantic-v1",
      generated_by: automationContract.generated_by
    };

    // Write CANONICAL meta.json
    const metaPath = path.join(v1Dir, "meta.json");
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

    // DUAL-WRITE: Write LEGACY index.json for backward compatibility
    const legacyIndex: PageCacheIndex = {
      cacheVersion: "0.1.0",
      contractSha256, // ✅ CRITICAL: Link index to contract
      generated_by: automationContract.generated_by,
      pages: pages.map(p => ({
        pageId: p.pageId,
        sourcePath: p.sourcePath,
        inferredName: p.inferredName,
        confidence: p.confidence
      })).sort((a, b) =>
        (b.confidence - a.confidence) || a.pageId.localeCompare(b.pageId)
      )
    };

    const legacyIndexPath = path.join(outputDir, "index.json");
    await fs.writeFile(legacyIndexPath, JSON.stringify(legacyIndex, null, 2));

    return { ok: true, pagesWritten: pages.length };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Failed to build page cache: ${message}` };
  }
}

/**
 * Legacy function for backward compatibility.
 * This will be deprecated in favor of contract-derived buildPageCache.
 *
 * @deprecated Use buildPageCache with contract bundle instead
 */
export function buildPageSemanticCache(params: {
  repoRoot: string;
  topology: any;
  limits?: any;
}): { index: any; summary: any; pages: any[]; written: string[] } {
  throw new Error(
    "buildPageSemanticCache is deprecated. Use buildPageCache with contract bundle instead. " +
    "This enforces the contract-derived boundary: NO RepoTopologyJSON access allowed."
  );
}
