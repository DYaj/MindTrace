// mindtrace-ai-runtime/src/contract-awareness/types.ts
//
// Phase 2.0: Contract-Awareness Module — Type Definitions
// Non-goals: No behavior, only types

/**
 * Error codes for contract-awareness issues.
 *
 * Contract-related:
 * - CA_CONTRACT_DIR_MISSING: .mcp-contract/ or .mindtrace/contracts/ not found
 * - CA_MISSING_FILE: Expected contract file (e.g., selector-policy.json) not found
 * - CA_JSON_PARSE_ERROR: Contract file exists but contains invalid JSON
 * - CA_SCHEMA_INVALID: Contract file parsed but doesn't match expected schema
 * - CA_HASH_MISMATCH: Contract hash doesn't match expected value
 * - CA_LEGACY_PATH: Contract loaded from legacy .mindtrace/contracts/ path (warning)
 *
 * Cache-related:
 * - CA_CACHE_DIR_MISSING: Page cache directory not found
 * - CA_CACHE_HASH_MISMATCH: Cache hash doesn't match contract hash
 */
export type ContractAwarenessErrorCode =
  | "CA_CONTRACT_DIR_MISSING"
  | "CA_MISSING_FILE"
  | "CA_JSON_PARSE_ERROR"
  | "CA_SCHEMA_INVALID"
  | "CA_HASH_MISMATCH"
  | "CA_LEGACY_PATH"
  | "CA_CACHE_DIR_MISSING"
  | "CA_CACHE_HASH_MISMATCH";

/**
 * Category of the issue.
 * - contract: Issue with the automation contract bundle
 * - cache: Issue with the page cache binding
 * - system: System-level issue (e.g., file I/O errors)
 */
export type IssueCategory = "contract" | "cache" | "system";

/**
 * Severity of the issue.
 * - ERROR: Critical issue that prevents operation
 * - WARN: Non-critical issue that should be logged
 */
export type IssueSeverity = "ERROR" | "WARN";

/**
 * Structured issue record for contract-awareness operations.
 *
 * The context field provides additional diagnostic information:
 * - For CA_CONTRACT_DIR_MISSING: { triedPaths: string[] }
 * - For CA_MISSING_FILE: { file: string, contractDir: string }
 * - For CA_JSON_PARSE_ERROR: { file: string, error: string }
 * - For CA_SCHEMA_INVALID: { file: string, validationErrors: unknown[] }
 * - For CA_HASH_MISMATCH: { expected: string, actual: string }
 * - For CA_LEGACY_PATH: { path: string }
 * - For CA_CACHE_DIR_MISSING: { triedPaths: string[] }
 * - For CA_CACHE_HASH_MISMATCH: { expected: string, actual: string }
 */
export type ContractAwarenessIssue = {
  code: ContractAwarenessErrorCode;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  context?: Record<string, unknown>;
};

/**
 * Result of loading the automation contract bundle from disk.
 *
 * Success case (ok: true):
 * - contractDir: absolute path to .mcp-contract/ or .mindtrace/contracts/
 * - isLegacy: false for canonical (.mcp-contract/), true for legacy (.mindtrace/contracts/)
 * - contractHash: SHA256 hash of the loaded contract bundle
 * - files: map of filename -> parsed JSON content (e.g., {"selector-policy.json": {...}})
 * - issues: any warnings encountered during load (e.g., CA_LEGACY_PATH if using legacy path)
 *
 * Failure case (ok: false):
 * - contractDir: null (directory not found or inaccessible)
 * - isLegacy: indicates which path was attempted (canonical=false, legacy=true)
 *   Note: This is meaningful even on failure to help diagnose which path failed
 * - contractHash: null (no contract loaded, nothing to hash)
 * - files: {} (always empty object - no files were successfully loaded)
 *   Note: Never partially populated; it's either all files on success or empty on failure
 * - issues: error issues explaining why load failed (e.g., CA_CONTRACT_DIR_MISSING)
 */
export type LoadContractBundleResult =
  | {
      ok: true;
      contractDir: string;
      isLegacy: boolean;
      contractHash: string;
      files: Record<string, unknown>;
      issues: ContractAwarenessIssue[];
    }
  | {
      ok: false;
      contractDir: null;
      isLegacy: boolean;
      contractHash: null;
      files: Record<string, unknown>;
      issues: ContractAwarenessIssue[];
    };

/**
 * Result of validating the loaded contract bundle.
 *
 * - ok: true if all required files are present and valid, false otherwise
 * - issues: validation issues found (e.g., CA_MISSING_FILE, CA_SCHEMA_INVALID)
 *
 * Note: This is separate from LoadContractBundleResult because validation
 * happens after loading and checks schema compliance, not just file existence.
 */
export type ContractValidationResult = {
  ok: boolean;
  issues: ContractAwarenessIssue[];
};

/**
 * Result of binding page semantic cache to automation contract.
 *
 * Cache is ADVISORY/OPTIONAL - all results return ok: true with warnings only.
 * Cache issues NEVER cause execution failure (always WARN severity, never ERROR).
 *
 * When cache found and valid:
 * - ok: true
 * - cacheDir: absolute path to .mcp-cache/v1/ (canonical) or .mcp-cache/ (legacy)
 * - cacheHash: SHA256 from cache metadata (contractSha256 field)
 * - issues: warnings array (may include CA_LEGACY_PATH, CA_CACHE_HASH_MISMATCH)
 *
 * When cache missing or invalid:
 * - ok: true (cache is optional, not required)
 * - cacheDir: null
 * - cacheHash: null
 * - issues: warnings array (CA_CACHE_DIR_MISSING, CA_JSON_PARSE_ERROR, etc.)
 *
 * All cache-related issues have severity: "WARN" (never "ERROR").
 */
export type PageCacheBindResult = {
  ok: boolean;
  cacheDir: string | null;
  cacheHash: string | null;
  issues: ContractAwarenessIssue[];
};

/**
 * Runtime strategy context assembled from contract + cache binding.
 *
 * This is the final artifact used by the runtime during test execution.
 *
 * Success case (ok: true):
 * - contractHash: SHA256 of the loaded contract
 * - cacheHash: hash from the cache (should match contractHash)
 * - selectorPolicy: parsed selector-policy.json content
 * - healingPolicy: parsed healing-policy.json content
 * - pageCacheBySite: parsed page-cache-by-site.json content
 * - issues: any warnings (e.g., CA_LEGACY_PATH)
 *
 * Failure case (ok: false):
 * - contractHash: null if contract failed to load
 * - cacheHash: null if cache binding failed
 * - selectorPolicy: {} (empty object)
 * - healingPolicy: {} (empty object)
 * - pageCacheBySite: {} (empty object)
 * - issues: error issues explaining what failed
 *
 * Note: The runtime should check `ok` before using policy fields.
 * In BEST_EFFORT mode, the runtime may continue with empty policies.
 * In COMPLIANCE mode, the runtime should exit if ok=false.
 */
export type RuntimeStrategyContext = {
  ok: boolean;
  contractHash: string | null;
  cacheHash: string | null;
  selectorPolicy: Record<string, unknown>;
  healingPolicy: Record<string, unknown>;
  pageCacheBySite: Record<string, unknown>;
  issues: ContractAwarenessIssue[];
};

/**
 * Compliance mode for contract-awareness.
 *
 * - COMPLIANCE: Strict mode - runtime MUST exit if contract loading fails (ok=false)
 * - BEST_EFFORT: Permissive mode - runtime MAY continue with empty policies
 *
 * Set via MINDTRACE_COMPLIANCE_MODE environment variable.
 * Default: BEST_EFFORT (backwards compatible)
 */
export type ComplianceMode = "COMPLIANCE" | "BEST_EFFORT";
