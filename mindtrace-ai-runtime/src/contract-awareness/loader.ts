// mindtrace-ai-runtime/src/contract-awareness/loader.ts
//
// Phase 2.0: Contract-Awareness Module — Contract Loader
// Dual-read path resolution and contract bundle loading

import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import type { LoadContractBundleResult, ComplianceMode, ContractAwarenessIssue } from "./types";
import { createIssue } from "./helpers";

/**
 * Required contract files in strict mode (COMPLIANCE).
 * These are the 7 fingerprinted files from Phase 0.
 */
const REQUIRED_FILES_STRICT = [
  "repo-topology.json",
  "selector-policy.json",
  "healing-policy.json",
  "wrapper-discovery.json",
  "policy-decision.json",
  "meta.json",
  "fingerprint.json",
];

/**
 * Resolve contract directory using dual-read strategy.
 *
 * Priority:
 * 1. Canonical path: <repoRoot>/.mcp-contract/
 * 2. Legacy path: <repoRoot>/.mindtrace/contracts/
 *
 * Returns:
 * - contractDir: absolute path if found, null otherwise
 * - isLegacy: true if using legacy path
 * - issues: warnings (CA_LEGACY_PATH) or errors (CA_CONTRACT_DIR_MISSING)
 */
export function resolveContractDir(repoRoot: string): {
  contractDir: string | null;
  isLegacy: boolean;
  issues: ContractAwarenessIssue[];
} {
  const canonicalDir = join(repoRoot, ".mcp-contract");
  const legacyDir = join(repoRoot, ".mindtrace/contracts");

  if (existsSync(canonicalDir)) {
    return { contractDir: canonicalDir, isLegacy: false, issues: [] };
  }

  if (existsSync(legacyDir)) {
    return {
      contractDir: legacyDir,
      isLegacy: true,
      issues: [createIssue("CA_LEGACY_PATH", "Using legacy contract path: .mindtrace/contracts/", { path: legacyDir })],
    };
  }

  return {
    contractDir: null,
    isLegacy: false,
    issues: [
      createIssue("CA_CONTRACT_DIR_MISSING", "No contract directory found", {
        triedPaths: [canonicalDir, legacyDir],
      }),
    ],
  };
}

/**
 * Load all contract files from the resolved directory and compute fingerprint hash.
 *
 * Behavior:
 * - Resolves contract dir (canonical → legacy)
 * - Loads all .json files from the directory
 * - Computes SHA256 hash of concatenated file contents (deterministic)
 * - Returns LoadContractBundleResult (ok: true on success, ok: false on error)
 *
 * Error cases:
 * - Contract dir missing → ok: false, CA_CONTRACT_DIR_MISSING
 * - JSON parse error → ok: false, CA_JSON_PARSE_ERROR
 * - Missing required files (COMPLIANCE mode) → ok: false, CA_MISSING_FILE
 */
export function loadContractBundle(args: {
  repoRoot: string;
  mode: ComplianceMode;
}): LoadContractBundleResult {
  const { contractDir, isLegacy, issues } = resolveContractDir(args.repoRoot);

  if (!contractDir) {
    return {
      ok: false,
      contractDir: null,
      isLegacy,
      contractHash: null,
      files: {},
      issues,
    };
  }

  const files: Record<string, unknown> = {};
  const allIssues = [...issues]; // Start with resolution issues (e.g., CA_LEGACY_PATH)

  // Read all .json files
  const filenames = readdirSync(contractDir).filter((f) => f.endsWith(".json"));

  for (const filename of filenames) {
    const filePath = join(contractDir, filename);
    try {
      const content = readFileSync(filePath, "utf-8");
      files[filename] = JSON.parse(content);
    } catch (error) {
      allIssues.push(
        createIssue("CA_JSON_PARSE_ERROR", `Failed to parse ${filename}`, {
          file: filename,
          error: String(error),
        })
      );
      return {
        ok: false,
        contractDir: null,
        isLegacy,
        contractHash: null,
        files: {},
        issues: allIssues,
      };
    }
  }

  // Check for missing required files in COMPLIANCE mode
  if (args.mode === "COMPLIANCE") {
    for (const requiredFile of REQUIRED_FILES_STRICT) {
      if (!files[requiredFile]) {
        allIssues.push(
          createIssue("CA_MISSING_FILE", `Required file missing: ${requiredFile}`, {
            file: requiredFile,
          })
        );
        return {
          ok: false,
          contractDir: null,
          isLegacy,
          contractHash: null,
          files: {},
          issues: allIssues,
        };
      }
    }
  }

  // Compute deterministic hash (concatenate sorted file contents)
  const sortedKeys = Object.keys(files).sort();
  const hashInput = sortedKeys.map((key) => JSON.stringify(files[key])).join("");
  const contractHash = createHash("sha256").update(hashInput).digest("hex");

  return {
    ok: true,
    contractDir,
    isLegacy,
    contractHash,
    files,
    issues: allIssues,
  };
}
