import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CacheIntegrityResult, VerifiedContractContext, VerifiedCacheContext } from './integrity-types.js';
import { CacheIntegrityError } from './integrity-errors.js';
import { detectDrift } from './drift-detector.js';

/**
 * Verify cache integrity and contract binding (path-sensitive gate)
 *
 * Critical Rules:
 * - Path-sensitive - only fails execution when cache required for current path
 * - Mode-aware - strict mode fails only when cache required
 * - Drift always invalidates cache (hard invariant)
 * - Verifier only - never repairs or regenerates cache
 */
export function verifyCacheIntegrity(
  repoRoot: string,
  verifiedContract: VerifiedContractContext,
  options: {
    mode: 'default' | 'strict';
    cacheRequiredForPath: boolean;
  }
): CacheIntegrityResult {
  const cacheDir = join(repoRoot, '.mcp-cache/v1');
  const metaFile = join(cacheDir, 'meta.json');

  // Step 1: Check cache directory exists
  if (!existsSync(cacheDir)) {
    return {
      status: 'invalid',
      reason: {
        type: 'missing',
        code: 'CACHE_DIR_NOT_FOUND'
      },
      required: options.cacheRequiredForPath,
      recommendedAction: determineAction(options),
      failureExitCode: shouldFailHard(options) ? 3 : undefined
    };
  }

  // Step 2: Load cache metadata
  if (!existsSync(metaFile)) {
    return {
      status: 'invalid',
      reason: {
        type: 'missing',
        code: 'CACHE_META_MISSING'
      },
      required: options.cacheRequiredForPath,
      recommendedAction: determineAction(options),
      failureExitCode: shouldFailHard(options) ? 3 : undefined
    };
  }

  let cacheMeta: any;
  try {
    const content = readFileSync(metaFile, 'utf-8');
    cacheMeta = JSON.parse(content);
  } catch (error) {
    return {
      status: 'invalid',
      reason: {
        type: 'schema_invalid',
        schemaErrors: [error instanceof Error ? error.message : String(error)],
        code: 'CACHE_SCHEMA_INVALID'
      },
      required: options.cacheRequiredForPath,
      recommendedAction: determineAction(options),
      failureExitCode: shouldFailHard(options) ? 3 : undefined
    };
  }

  // Step 3: Validate cache version
  if (!cacheMeta.cacheVersion) {
    return {
      status: 'invalid',
      reason: {
        type: 'schema_invalid',
        schemaErrors: ['Missing cacheVersion field'],
        code: 'CACHE_SCHEMA_INVALID'
      },
      required: options.cacheRequiredForPath,
      recommendedAction: determineAction(options),
      failureExitCode: shouldFailHard(options) ? 3 : undefined
    };
  }

  // ============================================================================
  // Step 3.5: Extract contract binding
  // ============================================================================
  // ARCHITECTURE: Read compatibly - prefer canonical, fallback to legacy
  // See: docs/standards/cache-metadata-schema.md
  //
  // CANONICAL FIELD: contractSha256
  // LEGACY FIELDS (compatibility only): contractBinding, contract_hash
  //
  // TODO: Add logging/warning when legacy fields are used
  // TODO: Support strict mode to reject legacy fields
  // ============================================================================
  const contractBinding =
    cacheMeta.contractSha256 ||           // ← CANONICAL (preferred)
    cacheMeta.contractBinding ||          // ← LEGACY (compatibility fallback)
    cacheMeta.contract_hash;              // ← LEGACY (compatibility fallback)

  if (!contractBinding) {
    return {
      status: 'invalid',
      reason: {
        type: 'drift',
        driftType: 'binding_missing',
        expectedHash: verifiedContract.fingerprint,
        actualHash: '<missing>',
        code: 'CACHE_BINDING_MISSING'
      },
      required: options.cacheRequiredForPath,
      recommendedAction: determineAction(options),
      failureExitCode: shouldFailHard(options) ? 3 : undefined
    };
  }

  // ============================================================================
  // Step 3.6: Determine page count
  // ============================================================================
  // CANONICAL FIELD: pages_count
  // LEGACY FALLBACK: pages.length (derived)
  // ============================================================================
  const pageCount =
    cacheMeta.pages_count ||              // ← CANONICAL (preferred)
    cacheMeta.pages?.length ||            // ← LEGACY (compatibility fallback)
    0;

  // Step 4: Detect drift (pure logic)
  const driftResult = detectDrift(verifiedContract, contractBinding);

  if (driftResult.drift) {
    // Cache is IMMEDIATELY INVALID (hard invariant)
    return {
      status: 'invalid',
      reason: {
        type: 'drift',
        driftType: driftResult.driftType,
        expectedHash: verifiedContract.fingerprint,
        actualHash: driftResult.previousHash,
        code: driftResult.code
      },
      required: options.cacheRequiredForPath,
      recommendedAction: determineAction(options),
      failureExitCode: shouldFailHard(options) ? 3 : undefined
    };
  }

  // Step 5: Success - cache is valid
  const cache: VerifiedCacheContext = {
    cacheDir,
    contractBinding,
    cacheVersion: cacheMeta.cacheVersion,
    pageCount,
    mode: options.mode,
    cacheRequiredForPath: options.cacheRequiredForPath
  };

  return {
    status: 'valid',
    cache
  };
}

function determineAction(options: { mode: string; cacheRequiredForPath: boolean }): 'continue_without_cache' | 'fail_hard' {
  if (options.mode === 'strict' && options.cacheRequiredForPath) {
    return 'fail_hard';
  }
  return 'continue_without_cache';
}

function shouldFailHard(options: { mode: string; cacheRequiredForPath: boolean }): boolean {
  return options.mode === 'strict' && options.cacheRequiredForPath;
}
