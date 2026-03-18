import type { IntegrityStatus, GateResult, DriftResult } from '@breakline/ui-types';
import {
  verifyContractIntegrity,
  verifyCacheIntegrity,
  type ContractIntegrityResult,
  type CacheIntegrityResult,
  type CacheDriftReason,
  type CacheSchemaInvalid,
  type CacheMissing,
  type CacheVersionIncompatible
} from '@mindtrace/integrity-gates';
import { getRepoRoot } from '../utils/repo-root.js';

/**
 * Integrity gates service
 *
 * CRITICAL: This DELEGATES to @mindtrace/integrity-gates.
 * Do NOT implement gate logic here.
 * This service is a THIN ADAPTER that maps integrity-gates results to UI types.
 *
 * AUTHORITATIVE SOURCE: @mindtrace/integrity-gates package
 */
export class IntegrityService {
  private static getRepoRoot(): string {
    return getRepoRoot();
  }

  /**
   * Get integrity status from all gates
   *
   * DELEGATES to @mindtrace/integrity-gates for all checks.
   * Maps results to UI types only.
   */
  static async getIntegrityStatus(): Promise<IntegrityStatus> {
    const repoRoot = this.getRepoRoot();

    // Step 1: Verify contract integrity
    const contractResult: ContractIntegrityResult = await verifyContractIntegrity(
      repoRoot,
      { mode: 'legacy_fallback' }
    );

    const contractGate: GateResult = this.mapContractResult(contractResult);

    // Step 2: Verify cache integrity (only if contract is valid)
    let cacheGate: GateResult;
    let driftCheck: DriftResult;

    if (contractResult.status === 'valid') {
      const cacheResult: CacheIntegrityResult = await verifyCacheIntegrity(
        repoRoot,
        contractResult.contract, // Pass VerifiedContractContext
        { mode: 'default', cacheRequiredForPath: false }
      );

      const mappedCache = this.mapCacheResult(cacheResult);
      cacheGate = mappedCache.gate;
      driftCheck = mappedCache.drift;
    } else {
      // Contract invalid - cache cannot be verified
      cacheGate = {
        status: 'invalid',
        reason: 'Contract must be valid before cache verification'
      };
      driftCheck = {
        drift: null,
        reason: 'Contract verification failed'
      };
    }

    return {
      contractGate,
      cacheGate,
      driftCheck
    };
  }

  /**
   * Map contract result to UI type
   * CORRECTED: Simple status with details, no artificial codes
   */
  private static mapContractResult(result: ContractIntegrityResult): GateResult {
    if (result.status === 'valid') {
      return {
        status: 'valid',
        details: `Fingerprint: ${result.contract.fingerprint.substring(0, 16)}..., Source: ${result.contract.verificationSource}`
      };
    } else {
      return {
        status: 'invalid',
        reason: result.error instanceof Error ? result.error.message : String(result.error),
        details: `Exit code: ${result.failureExitCode}, Action: ${result.recommendedAction}`
      };
    }
  }

  /**
   * Map cache result to UI type
   * CORRECTED: Includes drift information from verifyCacheIntegrity (no separate detectDrift call)
   */
  private static mapCacheResult(
    result: CacheIntegrityResult
  ): {
    gate: GateResult;
    drift: DriftResult;
  } {
    if (result.status === 'valid') {
      return {
        gate: {
          status: 'valid',
          details: `Pages: ${result.cache.pageCount}, Binding: ${result.cache.contractBinding.substring(0, 16)}...`
        },
        drift: {
          drift: false,
          currentHash: result.cache.contractBinding,
          details: 'Cache binding matches contract fingerprint'
        }
      };
    }

    // Invalid cache - narrow type and check if reason is drift
    const reason = result.reason;
    const isDrift = reason.type === 'drift';

    return {
      gate: {
        status: 'invalid',
        reason: this.formatCacheReason(reason),
        details: `Required: ${result.required}, Action: ${result.recommendedAction}`
      },
      drift: isDrift && reason.type === 'drift'
        ? {
            drift: true,
            expectedHash: reason.expectedHash,
            actualHash: reason.actualHash === '<missing>' ? 'missing' : reason.actualHash,
            driftType: reason.driftType,
            details: `Code: ${reason.code}`
          }
        : {
            drift: null,
            reason: `Cache invalid: ${reason.type}`
          }
    };
  }

  /**
   * Format cache invalidation reason for UI
   * CORRECTED: Only handles reason types that exist in @mindtrace/integrity-gates
   */
  private static formatCacheReason(
    reason: CacheDriftReason | CacheSchemaInvalid | CacheMissing | CacheVersionIncompatible
  ): string {
    switch (reason.type) {
      case 'drift':
        return `Drift detected: ${reason.driftType}`;
      case 'missing':
        return `Cache missing: ${reason.code}`;
      case 'schema_invalid':
        return 'Cache schema validation failed';
      case 'version_incompatible':
        return `Version incompatible: ${reason.cacheVersion}`;
      default:
        // Exhaustiveness check
        const _exhaustive: never = reason;
        return _exhaustive;
    }
  }
}
