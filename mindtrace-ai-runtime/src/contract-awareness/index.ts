// mindtrace-ai-runtime/src/contract-awareness/index.ts
//
// Phase 2.0: Contract-Awareness Module — Public API
// Barrel export for the 5 main functions + types

// Main functions (5 public API functions)
export { loadContractBundle } from "./loader";
export { validateContractBundle, verifyFingerprint } from "./validator";
export { bindCacheToContract } from "./cache-binding";
export { buildRuntimeStrategyContext } from "./strategy-context";
export { writeContractAwarenessArtifact } from "./writer";

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
} from "./types";

// Helpers (for advanced usage)
export { createIssue, getSeverity, issuesBySeverity } from "./helpers";
