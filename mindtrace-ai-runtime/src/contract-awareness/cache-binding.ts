// mindtrace-ai-runtime/src/contract-awareness/cache-binding.ts
//
// Phase 2.0: Contract-Awareness Module — Cache Binding
// Load page semantic cache and bind to contract

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { PageCacheBindResult } from "./types";
import { createIssue } from "./helpers";

/**
 * Load page semantic cache using dual-read strategy.
 *
 * Priority:
 * 1. Canonical path: <repoRoot>/.mcp-cache/v1/meta.json
 * 2. Legacy path: <repoRoot>/.mcp-cache/index.json
 *
 * Behavior:
 * - Canonical: read meta.json and extract contractSha256
 * - Legacy: read index.json and extract contractSha256
 * - Missing cache: return ok: true with CA_CACHE_DIR_MISSING warning (cache is optional)
 *
 * @param args - { repoRoot: string }
 * @returns PageCacheBindResult with cacheDir, cacheHash, issues
 */
export function loadPageCache(args: { repoRoot: string }): PageCacheBindResult {
  const canonicalDir = join(args.repoRoot, ".mcp-cache/v1");
  const canonicalMeta = join(canonicalDir, "meta.json");

  const legacyDir = join(args.repoRoot, ".mcp-cache");
  const legacyIndex = join(legacyDir, "index.json");

  // Try canonical path first
  if (existsSync(canonicalMeta)) {
    try {
      const content = readFileSync(canonicalMeta, "utf-8");
      const meta = JSON.parse(content);
      const cacheHash = meta.contractSha256 || null;

      return {
        ok: true,
        cacheDir: canonicalDir,
        cacheHash,
        issues: [],
      };
    } catch (error) {
      // Parse error - return warning
      return {
        ok: true,
        cacheDir: null,
        cacheHash: null,
        issues: [
          createIssue("CA_JSON_PARSE_ERROR", "Failed to parse .mcp-cache/v1/meta.json", {
            file: "meta.json",
            error: String(error),
          }),
        ],
      };
    }
  }

  // Try legacy path
  if (existsSync(legacyIndex)) {
    try {
      const content = readFileSync(legacyIndex, "utf-8");
      const index = JSON.parse(content);
      const cacheHash = index.contractSha256 || null;

      return {
        ok: true,
        cacheDir: legacyDir,
        cacheHash,
        issues: [
          createIssue("CA_LEGACY_PATH", "Using legacy cache path: .mcp-cache/index.json", {
            path: legacyDir,
          }),
        ],
      };
    } catch (error) {
      return {
        ok: true,
        cacheDir: null,
        cacheHash: null,
        issues: [
          createIssue("CA_JSON_PARSE_ERROR", "Failed to parse .mcp-cache/index.json", {
            file: "index.json",
            error: String(error),
          }),
        ],
      };
    }
  }

  // No cache found - this is OK, cache is optional
  return {
    ok: true,
    cacheDir: null,
    cacheHash: null,
    issues: [
      createIssue("CA_CACHE_DIR_MISSING", "No page cache found", {
        triedPaths: [canonicalMeta, legacyIndex],
      }),
    ],
  };
}

/**
 * Bind page cache to contract by verifying hash match.
 *
 * Behavior:
 * - Load cache using loadPageCache
 * - Compare cache hash with contract hash
 * - Hash mismatch: add CA_CACHE_HASH_MISMATCH warning (NOT error - cache is advisory)
 * - Missing cache: add CA_CACHE_DIR_MISSING warning
 * - Always returns ok: true (cache issues never fail execution)
 *
 * @param args - { repoRoot: string, contractHash: string }
 * @returns PageCacheBindResult with warnings for mismatches
 */
export function bindCacheToContract(args: {
  repoRoot: string;
  contractHash: string;
}): PageCacheBindResult {
  const cacheResult = loadPageCache({ repoRoot: args.repoRoot });

  // Cache missing or parse error - propagate warnings
  if (!cacheResult.cacheHash) {
    return cacheResult;
  }

  // Verify hash match
  if (cacheResult.cacheHash !== args.contractHash) {
    return {
      ok: true, // Cache mismatch is WARN, not error
      cacheDir: cacheResult.cacheDir,
      cacheHash: cacheResult.cacheHash,
      issues: [
        ...cacheResult.issues,
        createIssue("CA_CACHE_HASH_MISMATCH", "Cache hash does not match contract hash", {
          expected: args.contractHash,
          actual: cacheResult.cacheHash,
        }),
      ],
    };
  }

  // Hash matches - success
  return cacheResult;
}
