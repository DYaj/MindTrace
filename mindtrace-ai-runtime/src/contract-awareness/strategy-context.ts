// mindtrace-ai-runtime/src/contract-awareness/strategy-context.ts
//
// Phase 2.0: Contract-Awareness Module — Strategy Context Builder
// Assemble final runtime strategy context from contract + cache

import type {
  LoadContractBundleResult,
  ContractValidationResult,
  PageCacheBindResult,
  RuntimeStrategyContext,
} from "./types.js";
import { issuesBySeverity } from "./helpers.js";

/**
 * Build the runtime strategy context from validated contract and cache.
 *
 * This is the final assembly step that:
 * 1. Combines all validation results (contract loader, schema validator, fingerprint, cache)
 * 2. Extracts selector policy and healing policy from contract
 * 3. Organizes page cache data (if available)
 * 4. Returns RuntimeStrategyContext ready for runtime execution
 *
 * Behavior:
 * - ok: true if no contract ERRORs (cache WARNs are OK)
 * - ok: false if any contract ERRORs exist
 * - All issues accumulated (contract + cache)
 * - Missing policies return empty objects
 *
 * @param args - { contractBundle, validation, fingerprint, cache }
 * @returns RuntimeStrategyContext
 */
export function buildRuntimeStrategyContext(args: {
  contractBundle: Extract<LoadContractBundleResult, { ok: true }>;
  validation: ContractValidationResult;
  fingerprint: ContractValidationResult;
  cache: PageCacheBindResult;
}): RuntimeStrategyContext {
  // Accumulate all issues
  const allIssues = [
    ...args.contractBundle.issues,
    ...args.validation.issues,
    ...args.fingerprint.issues,
    ...args.cache.issues,
  ];

  // Determine ok status: no ERRORs allowed (WARNs are OK)
  const { ERROR } = issuesBySeverity(allIssues);
  const ok = ERROR.length === 0;

  // Extract policies from contract
  const selectorPolicy = (args.contractBundle.files["selector-policy.json"] as Record<string, unknown>) || {};
  const healingPolicy = (args.contractBundle.files["healing-policy.json"] as Record<string, unknown>) || {};

  // TODO: Parse page cache and organize by site/domain
  // For now, return empty object (cache integration is future work)
  const pageCacheBySite: Record<string, unknown> = {};

  return {
    ok,
    contractHash: args.contractBundle.contractHash,
    cacheHash: args.cache.cacheHash,
    selectorPolicy,
    healingPolicy,
    pageCacheBySite,
    issues: allIssues,
  };
}
