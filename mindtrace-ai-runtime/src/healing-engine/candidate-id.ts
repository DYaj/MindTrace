// mindtrace-ai-runtime/src/healing-engine/candidate-id.ts
import crypto from "crypto";
import type { TierName, LocatorType } from "./types";

/**
 * Generate stable candidate ID
 * Format: {tier}_{locatorType}_{hash}
 *
 * Uses SHA-256 hash of canonicalized inputs for deterministic IDs.
 * Selector normalization ensures consistent hashing despite formatting differences.
 *
 * @param params - Parameters for candidate ID generation
 * @returns Candidate ID in format: {tier}_{locatorType}_{hash16}
 */
export function generateCandidateId(params: {
  tier: TierName;
  locatorType: LocatorType;
  selector: string;
  pageKey?: string;
}): string {
  const { tier, locatorType, selector, pageKey } = params;

  // Normalize selector (deterministic)
  const normalizedSelector = normalizeSelector(selector);

  // Create canonical hash input with sorted keys
  const hashInput = JSON.stringify({
    locatorType,
    pageKey: pageKey || "",
    selector: normalizedSelector,
    tier
  });

  // Compute stable hash (SHA-256, first 16 hex chars)
  const hash = crypto
    .createHash("sha256")
    .update(hashInput)
    .digest("hex")
    .substring(0, 16);

  return `${tier}_${locatorType}_${hash}`;
}

/**
 * Normalize selector for deterministic hashing
 *
 * Normalization rules:
 * 1. Trim leading/trailing whitespace
 * 2. Collapse multiple whitespace to single space
 * 3. Lowercase entire string
 *
 * @param selector - Raw selector string
 * @returns Normalized selector
 */
function normalizeSelector(selector: string): string {
  return selector
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
