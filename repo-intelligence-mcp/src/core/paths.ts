import * as fs from "node:fs";
import * as path from "node:path";

export type ContractDirResult = {
  dir: string;
  isLegacy: boolean;
};

/**
 * Resolve contract directory with fallback to legacy path.
 *
 * Priority:
 * 1. .mcp-contract/ (canonical)
 * 2. .mindtrace/contracts/ (legacy fallback)
 * 3. .mcp-contract/ (default for creation)
 *
 * @param repoRoot - Repository root path
 * @returns Contract directory path and whether it's legacy
 */
export function resolveContractDir(repoRoot: string): ContractDirResult {
  const canonical = path.join(repoRoot, ".mcp-contract");
  const legacy = path.join(repoRoot, ".mindtrace", "contracts");

  // Prefer canonical
  if (fs.existsSync(canonical)) {
    return { dir: canonical, isLegacy: false };
  }

  // Fallback to legacy
  if (fs.existsSync(legacy)) {
    return { dir: legacy, isLegacy: true };
  }

  // Neither exists - use canonical for creation
  return { dir: canonical, isLegacy: false };
}
