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
import { getTargetRepoRoot } from '../utils/target-repo-root.js';

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
  /**
   * Get integrity status from all gates
   *
   * DELEGATES to @mindtrace/integrity-gates for all checks.
   * Maps results to UI types only.
   *
   * NOTE: Checks integrity of target repository
   */
  static async getIntegrityStatus(): Promise<IntegrityStatus> {
    const repoRoot = getTargetRepoRoot();

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
        details: JSON.stringify({
          fingerprint: result.contract.fingerprint,
          version: result.contract.version,
          verificationSource: result.contract.verificationSource,
          contractDir: result.contract.contractDir,
          fileCount: result.contract.files.length,
          files: result.contract.files
        }, null, 2)
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
          details: JSON.stringify({
            cacheDir: result.cache.cacheDir,
            contractBinding: result.cache.contractBinding,
            cacheVersion: result.cache.cacheVersion,
            pageCount: result.cache.pageCount,
            mode: result.cache.mode,
            cacheRequiredForPath: result.cache.cacheRequiredForPath
          }, null, 2)
        },
        drift: {
          drift: false,
          currentHash: result.cache.contractBinding,
          details: 'Cache binding matches contract fingerprint'
        }
      };
    }

    // Invalid cache - check if it's critical or just a warning
    const reason = result.reason;
    const isDrift = reason.type === 'drift';
    const isCritical = result.recommendedAction === 'fail_hard';

    // Build detailed error information
    let detailsInfo: any = {
      required: result.required,
      action: result.recommendedAction,
      code: reason.type === 'drift' ? reason.code :
            reason.type === 'missing' ? reason.code :
            reason.type === 'schema_invalid' ? reason.code :
            reason.type === 'version_incompatible' ? reason.code : undefined
    };

    // Add schema errors if available
    if (reason.type === 'schema_invalid') {
      detailsInfo.schemaErrors = reason.schemaErrors;
    }

    // Add version info if available
    if (reason.type === 'version_incompatible') {
      detailsInfo.cacheVersion = reason.cacheVersion;
      detailsInfo.supportedVersions = reason.supportedVersions;
    }

    return {
      gate: {
        status: isCritical ? 'invalid' : 'warning',
        reason: this.formatCacheReason(reason),
        details: JSON.stringify(detailsInfo, null, 2)
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
