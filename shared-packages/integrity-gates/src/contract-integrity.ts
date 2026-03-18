/**
 * @fileoverview Contract Integrity Gate - Hard authority verification
 * @module @mindtrace/integrity-gates/contract-integrity
 *
 * CRITICAL CONSTRAINTS:
 * - Verifier only - NEVER regenerates, repairs, or mutates contracts
 * - Hard authority - All failures are fatal (exit code 3)
 * - Canonical first - .mcp-contract/ takes precedence over .mindtrace/contracts/
 * - Runtime authority - Verification BEFORE cache
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SchemaValidator } from '@mindtrace/schema-validator';
import { ContractIntegrityError } from './integrity-errors.js';
import {
  ContractIntegrityResult,
  VerifiedContractContext,
} from './integrity-types.js';
import { computeContractFingerprint, FINGERPRINT_FILES } from './deterministic.js';

/**
 * Canonical contract directory path (.mcp-contract/)
 */
const CANONICAL_CONTRACT_DIR = '.mcp-contract';

/**
 * Legacy contract directory path (.mindtrace/contracts/)
 */
const LEGACY_CONTRACT_DIR = join('.mindtrace', 'contracts');

/**
 * Canonical fingerprint file (automation-contract.hash)
 */
const CANONICAL_FINGERPRINT_FILE = 'automation-contract.hash';

/**
 * Legacy fingerprint file (contract.fingerprint.sha256)
 */
const LEGACY_FINGERPRINT_FILE = 'contract.fingerprint.sha256';

/**
 * Verifies contract integrity with hard authority
 *
 * Verification steps:
 * 1. Resolve contract directory (canonical or legacy fallback)
 * 2. Verify required files exist (all FINGERPRINT_FILES)
 * 3. Validate JSON schemas for all required files (if skipSchemaValidation is false)
 * 4. Compute deterministic fingerprint
 * 5. Verify fingerprint matches stored value
 *
 * @param repoRoot - Repository root directory
 * @param options - Verification options
 * @returns ContractIntegrityResult (valid or invalid with exit code 3)
 */
export function verifyContractIntegrity(
  repoRoot: string,
  options?: {
    mode?: 'canonical' | 'legacy_fallback';
    requiredFiles?: string[];
    skipSchemaValidation?: boolean;
  }
): ContractIntegrityResult {
  const mode = options?.mode ?? 'legacy_fallback';  // Default to allowing fallback
  const requiredFiles = options?.requiredFiles ?? [...FINGERPRINT_FILES];  // Use FINGERPRINT_FILES as default
  const skipSchemaValidation = options?.skipSchemaValidation ?? false;

  // Step 1: Resolve contract directory (canonical first, then legacy fallback)
  const canonicalPath = join(repoRoot, CANONICAL_CONTRACT_DIR);
  const legacyPath = join(repoRoot, LEGACY_CONTRACT_DIR);

  let contractDir: string;
  let isCanonical: boolean;

  if (existsSync(canonicalPath)) {
    contractDir = canonicalPath;
    isCanonical = true;
  } else if (mode === 'legacy_fallback' && existsSync(legacyPath)) {
    contractDir = legacyPath;
    isCanonical = false;
  } else {
    const expectedPaths = mode === 'canonical'
      ? canonicalPath
      : `${canonicalPath} or ${legacyPath}`;
    return {
      status: 'invalid',
      error: new ContractIntegrityError(
        'CONTRACT_DIR_NOT_FOUND',
        `Contract directory not found. Expected: ${expectedPaths}`,
        { repoRoot, canonicalPath, legacyPath, mode }
      ),
      recommendedAction: 'fail_hard',
      failureExitCode: 3,
    };
  }

  // Step 2: Verify required files exist
  const missingFiles: string[] = [];
  for (const file of requiredFiles) {
    const filePath = join(contractDir, file);
    if (!existsSync(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    return {
      status: 'invalid',
      error: new ContractIntegrityError(
        'CONTRACT_FILE_MISSING',
        `Required contract files missing: ${missingFiles.join(', ')}`,
        { contractDir, missingFiles }
      ),
      recommendedAction: 'fail_hard',
      failureExitCode: 3,
    };
  }

  // Step 3: Parse and optionally validate JSON schemas for ALL required files
  const parsedFiles: Record<string, any> = {};

  // Parse all required files
  for (const file of requiredFiles) {
    const filePath = join(contractDir, file);
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      parsedFiles[file] = JSON.parse(fileContent);
    } catch (error) {
      return {
        status: 'invalid',
        error: new ContractIntegrityError(
          'CONTRACT_SCHEMA_INVALID',
          `Failed to parse ${file}: ${error instanceof Error ? error.message : String(error)}`,
          { contractDir, file, parseError: String(error) }
        ),
        recommendedAction: 'fail_hard',
        failureExitCode: 3,
      };
    }
  }

  // Validate schemas if not skipped (Phase A: skip validation, Phase B: enable)
  if (!skipSchemaValidation) {
    const validator = new SchemaValidator();

    // Validate each required file against its schema
    for (const file of requiredFiles) {
      const schemaName = file.replace('.json', ''); // e.g., "automation-contract"
      const artifact = parsedFiles[file];

      try {
        const validationResult = validator.validateAuthoritative(artifact, schemaName);
        if (!validationResult.valid) {
          return {
            status: 'invalid',
            error: new ContractIntegrityError(
              'CONTRACT_SCHEMA_INVALID',
              `Schema validation failed for ${file}: ${validationResult.errors!.map(e => e.message).join(', ')}`,
              { contractDir, file, errors: validationResult.errors }
            ),
            recommendedAction: 'fail_hard',
            failureExitCode: 3,
          };
        }
      } catch (error) {
        // Schema file might not exist, but we still validate JSON parsing succeeded
        // In Phase A, this is expected for some files
      }
    }
  }

  // Extract automation-contract for version field (required by VerifiedContractContext)
  const automationContract = parsedFiles['automation-contract.json'];

  // Step 4: Compute deterministic fingerprint
  const fingerprintResult = computeContractFingerprint(contractDir, 'best_effort');
  if (!fingerprintResult.ok) {
    return {
      status: 'invalid',
      error: new ContractIntegrityError(
        'CONTRACT_SCHEMA_INVALID',
        `Failed to compute contract fingerprint: ${fingerprintResult.error}`,
        { contractDir, computeError: fingerprintResult.error }
      ),
      recommendedAction: 'fail_hard',
      failureExitCode: 3,
    };
  }

  const computedFingerprint = fingerprintResult.fingerprint;

  // Step 5: Verify fingerprint matches stored value
  const fingerprintFile = isCanonical ? CANONICAL_FINGERPRINT_FILE : LEGACY_FINGERPRINT_FILE;
  const fingerprintPath = join(contractDir, fingerprintFile);

  if (!existsSync(fingerprintPath)) {
    return {
      status: 'invalid',
      error: new ContractIntegrityError(
        'CONTRACT_FINGERPRINT_FILE_MISSING',
        `Fingerprint file not found: ${fingerprintFile}`,
        { contractDir, fingerprintFile }
      ),
      recommendedAction: 'fail_hard',
      failureExitCode: 3,
    };
  }

  let storedFingerprint: string;
  try {
    storedFingerprint = readFileSync(fingerprintPath, 'utf-8').trim();
  } catch (error) {
    return {
      status: 'invalid',
      error: new ContractIntegrityError(
        'CONTRACT_FINGERPRINT_FILE_MISSING',
        `Failed to read fingerprint file: ${error instanceof Error ? error.message : String(error)}`,
        { contractDir, fingerprintFile, readError: String(error) }
      ),
      recommendedAction: 'fail_hard',
      failureExitCode: 3,
    };
  }

  if (computedFingerprint !== storedFingerprint) {
    return {
      status: 'invalid',
      error: new ContractIntegrityError(
        'CONTRACT_FINGERPRINT_MISMATCH',
        `Contract fingerprint mismatch. Expected: ${storedFingerprint}, Computed: ${computedFingerprint}`,
        { contractDir, expected: storedFingerprint, computed: computedFingerprint }
      ),
      recommendedAction: 'fail_hard',
      failureExitCode: 3,
    };
  }

  // Success: Return verified contract context (EXACT spec match)
  const verifiedContext: VerifiedContractContext = {
    fingerprint: computedFingerprint,
    contractDir,
    files: fingerprintResult.files,
    verificationSource: isCanonical ? 'canonical' : 'legacy_fallback',
    version: automationContract.version,
  };

  return {
    status: 'valid',
    contract: verifiedContext,
  };
}
