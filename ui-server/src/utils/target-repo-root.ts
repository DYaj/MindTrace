import { resolve } from 'path';
import { existsSync } from 'fs';
import { getBreaklineRoot } from './breakline-root.js';

/**
 * Resolve target repository root
 *
 * This is the repository being analyzed/tested:
 * - .mcp-contract
 * - .mcp-cache
 * - runs
 * - history
 * - tests
 *
 * Resolution strategy:
 * 1. Explicit override: BREAKLINE_TARGET_REPO env var
 * 2. Default to BreakLine installation root (for dev mode)
 */
export function resolveTargetRepoRoot(): string {
  // 1. Prefer explicit env override
  if (process.env.BREAKLINE_TARGET_REPO) {
    const root = resolve(process.env.BREAKLINE_TARGET_REPO);
    if (existsSync(root)) {
      return root;
    }
    throw new Error(`BREAKLINE_TARGET_REPO set but path does not exist: ${root}`);
  }

  // 2. Default to BreakLine installation root for dev mode
  // (testing BreakLine's own frameworks)
  return getBreaklineRoot();
}

/**
 * Cached target repo root - computed once on first access
 */
let cachedTargetRepoRoot: string | undefined;

/**
 * Get the target repository root (cached after first resolution)
 *
 * Use this for:
 * - Contract generation/reading
 * - Cache building/reading
 * - Test runs
 * - History/artifacts
 * - Compatibility checks
 */
export function getTargetRepoRoot(): string {
  if (!cachedTargetRepoRoot) {
    cachedTargetRepoRoot = resolveTargetRepoRoot();
  }
  return cachedTargetRepoRoot;
}

/**
 * Clear cached target repo root
 * (useful when switching target repos at runtime)
 */
export function clearTargetRepoCache(): void {
  cachedTargetRepoRoot = undefined;
}
