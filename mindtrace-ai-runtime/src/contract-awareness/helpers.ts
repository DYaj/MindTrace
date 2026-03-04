// mindtrace-ai-runtime/src/contract-awareness/helpers.ts
//
// Phase 2.0: Contract-Awareness Module — Error Helpers
// Utilities for creating and managing ContractAwarenessIssue objects

import type {
  ContractAwarenessErrorCode,
  ContractAwarenessIssue,
  IssueCategory,
  IssueSeverity,
} from "./types.js";

/**
 * Get the category for a given error code.
 *
 * Categories:
 * - "contract": issues with automation contract files/structure
 * - "cache": issues with page semantic cache
 * - "system": system-level issues (currently only CA_LEGACY_PATH)
 */
function getCategory(code: ContractAwarenessErrorCode): IssueCategory {
  if (code.startsWith("CA_CACHE_")) return "cache";
  if (code === "CA_LEGACY_PATH") return "system";
  return "contract";
}

/**
 * Get the severity level for a given error code.
 *
 * Severity rules:
 * - ERROR: contract issues (missing files, parse errors, schema invalid, hash mismatch)
 * - WARN: cache issues (cache is optional/advisory) and legacy path warning
 *
 * Note: Even in BEST_EFFORT mode, catastrophic issues (CA_JSON_PARSE_ERROR, CA_SCHEMA_INVALID)
 * remain ERROR severity but don't cause exit(3).
 */
export function getSeverity(code: ContractAwarenessErrorCode): IssueSeverity {
  // Cache issues are always WARN (cache is advisory)
  if (code.startsWith("CA_CACHE_")) return "WARN";

  // Legacy path is a warning
  if (code === "CA_LEGACY_PATH") return "WARN";

  // All contract issues are ERROR
  return "ERROR";
}

/**
 * Create a ContractAwarenessIssue with the given code, message, and optional context.
 *
 * Category and severity are automatically determined from the error code.
 *
 * @param code - Error code (e.g., CA_MISSING_FILE)
 * @param message - Human-readable error message
 * @param context - Optional diagnostic context (e.g., { file: "test.json", expected: "hash123" })
 */
export function createIssue(
  code: ContractAwarenessErrorCode,
  message: string,
  context?: Record<string, unknown>
): ContractAwarenessIssue {
  return {
    code,
    category: getCategory(code),
    severity: getSeverity(code),
    message,
    ...(context && { context }),
  };
}

/**
 * Group issues by severity level.
 *
 * Useful for determining whether to exit(3) in COMPLIANCE mode (any ERROR issues)
 * or to proceed with warnings (only WARN issues).
 *
 * @param issues - Array of issues to group
 * @returns Object with ERROR and WARN arrays
 */
export function issuesBySeverity(issues: ContractAwarenessIssue[]): {
  ERROR: ContractAwarenessIssue[];
  WARN: ContractAwarenessIssue[];
} {
  return {
    ERROR: issues.filter((i) => i.severity === "ERROR"),
    WARN: issues.filter((i) => i.severity === "WARN"),
  };
}
