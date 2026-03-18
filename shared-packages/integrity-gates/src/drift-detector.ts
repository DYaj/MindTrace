/**
 * @file drift-detector.ts
 * @description Pure drift detection logic (NO I/O, NO timestamps, NO side effects)
 *
 * Architecture:
 * - Pure function - deterministic, same inputs always produce same outputs
 * - Verifier only - detects drift facts, doesn't repair or mutate
 * - NO timestamp generation - coordinator adds timestamps during audit
 * - Compares contract fingerprint vs cache binding
 *
 * Drift types:
 * - hash_mismatch: cache hash exists but differs from contract hash
 * - binding_missing: cache hash field is missing/undefined
 */

import type { VerifiedContractContext, DriftDetectionResult } from './integrity-types.js';

/**
 * Detect drift between contract and cache (pure logic)
 *
 * @param verifiedContract - Verified contract context with fingerprint
 * @param cacheBinding - Cache binding hash (from cache metadata)
 * @returns Drift detection result (NO timestamps, pure data)
 *
 * @example
 * const result = detectDrift(contract, cacheBinding);
 * if (result.drift) {
 *   console.log(`Drift detected: ${result.code}`);
 * }
 */
export function detectDrift(
  verifiedContract: VerifiedContractContext,
  cacheBinding: string | undefined
): DriftDetectionResult {
  // Extract current fingerprint from verified contract
  const currentFingerprint = verifiedContract.fingerprint;

  // Drift detection logic (pure, deterministic)

  // Case 1: Binding field missing (undefined, null, empty)
  if (cacheBinding === undefined || cacheBinding === null || cacheBinding === '') {
    return {
      drift: true,
      currentFingerprint,
      previousHash: '<missing>',
      currentHash: currentFingerprint,
      driftType: 'binding_missing',
      code: 'CACHE_BINDING_MISSING'
    };
  }

  // Case 2: Hash mismatch (cache exists but differs)
  if (cacheBinding !== currentFingerprint) {
    return {
      drift: true,
      currentFingerprint,
      previousHash: cacheBinding,
      currentHash: currentFingerprint,
      driftType: 'hash_mismatch',
      code: 'CACHE_HASH_MISMATCH'
    };
  }

  // Case 3: No drift (hashes match)
  return {
    drift: false,
    currentFingerprint,
    cacheBinding
  };
}
