// mindtrace-ai-runtime/src/contract-awareness/index.ts
//
// Phase 2.0: Contract-Awareness Module — Public API
// Barrel export for the 5 main functions + types

// Main functions (5 public API functions)
export { loadContractBundle } from "./loader.js";
export { validateContractBundle, verifyFingerprint } from "./validator.js";
export { bindCacheToContract } from "./cache-binding.js";
export { buildRuntimeStrategyContext } from "./strategy-context.js";
export { writeContractAwarenessArtifact } from "./writer.js";

// Types (for consumers)
export type {
  ContractAwarenessErrorCode,
  IssueCategory,
  IssueSeverity,
  ContractAwarenessIssue,
  LoadContractBundleResult,
  ContractValidationResult,
  PageCacheBindResult,
  RuntimeStrategyContext,
  ComplianceMode,
} from "./types.js";

// Helpers (for advanced usage)
export { createIssue, getSeverity, issuesBySeverity } from "./helpers.js";
