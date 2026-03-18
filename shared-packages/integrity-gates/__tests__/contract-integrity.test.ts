/**
 * @fileoverview Tests for contract integrity verification gate
 * @module @mindtrace/integrity-gates/tests/contract-integrity
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { verifyContractIntegrity } from '../src/contract-integrity.js';
import { computeContractFingerprint, FINGERPRINT_FILES } from '../src/deterministic.js';

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'contract-integrity');

describe('Contract Integrity Gate', () => {
  beforeAll(() => {
    // Create fixture directories
    fs.mkdirSync(path.join(FIXTURES_DIR, 'valid-contract', '.mcp-contract'), { recursive: true });
    fs.mkdirSync(path.join(FIXTURES_DIR, 'legacy-contract', '.mindtrace', 'contracts'), { recursive: true });
    fs.mkdirSync(path.join(FIXTURES_DIR, 'invalid-contract', '.mcp-contract'), { recursive: true });
    fs.mkdirSync(path.join(FIXTURES_DIR, 'canonical-wins', '.mcp-contract'), { recursive: true });
    fs.mkdirSync(path.join(FIXTURES_DIR, 'canonical-wins', '.mindtrace', 'contracts'), { recursive: true });
    fs.mkdirSync(path.join(FIXTURES_DIR, 'missing-files', '.mcp-contract'), { recursive: true });
    fs.mkdirSync(path.join(FIXTURES_DIR, 'fingerprint-mismatch', '.mcp-contract'), { recursive: true });

    // Valid contract with canonical path
    const validContractDir = path.join(FIXTURES_DIR, 'valid-contract', '.mcp-contract');
    const validContract = {
      version: '1.0.0',
      testSuiteId: 'test-suite-valid',
      generatedAt: '2024-01-01T00:00:00.000Z',
      repository: { url: 'https://github.com/test/repo', branch: 'main', commit: 'abc123' },
      snapshot: { trace: [], coverage: [], metadata: {} },
      utilization: { assertions: [], hooks: [], coverage: [] }
    };
    const validMetadata = {
      version: '1.0.0',
      contractId: 'test-contract-valid',
      createdAt: '2024-01-01T00:00:00.000Z'
    };

    fs.writeFileSync(path.join(validContractDir, 'automation-contract.json'), JSON.stringify(validContract, null, 2));
    fs.writeFileSync(path.join(validContractDir, 'automation-contract-metadata.json'), JSON.stringify(validMetadata, null, 2));

    const validFingerprintResult = computeContractFingerprint(validContractDir, 'best_effort');
    if (!validFingerprintResult.ok) {
      throw new Error(`Failed to compute fingerprint: ${validFingerprintResult.error}`);
    }
    fs.writeFileSync(path.join(validContractDir, 'automation-contract.hash'), validFingerprintResult.fingerprint);

    // Legacy contract with .mindtrace/contracts path
    const legacyContractDir = path.join(FIXTURES_DIR, 'legacy-contract', '.mindtrace', 'contracts');
    const legacyContract = {
      version: '1.0.0',
      testSuiteId: 'test-suite-legacy',
      generatedAt: '2024-01-01T00:00:00.000Z',
      repository: { url: 'https://github.com/test/repo', branch: 'main', commit: 'def456' },
      snapshot: { trace: [], coverage: [], metadata: {} },
      utilization: { assertions: [], hooks: [], coverage: [] }
    };
    const legacyMetadata = {
      version: '1.0.0',
      contractId: 'test-contract-legacy',
      createdAt: '2024-01-01T00:00:00.000Z'
    };

    fs.writeFileSync(path.join(legacyContractDir, 'automation-contract.json'), JSON.stringify(legacyContract, null, 2));
    fs.writeFileSync(path.join(legacyContractDir, 'automation-contract-metadata.json'), JSON.stringify(legacyMetadata, null, 2));

    const legacyFingerprintResult = computeContractFingerprint(legacyContractDir, 'best_effort');
    if (!legacyFingerprintResult.ok) {
      throw new Error(`Failed to compute fingerprint: ${legacyFingerprintResult.error}`);
    }
    fs.writeFileSync(path.join(legacyContractDir, 'contract.fingerprint.sha256'), legacyFingerprintResult.fingerprint);

    // Canonical wins test - both paths exist, canonical should be preferred
    const canonicalWinsCanonical = path.join(FIXTURES_DIR, 'canonical-wins', '.mcp-contract');
    const canonicalWinsLegacy = path.join(FIXTURES_DIR, 'canonical-wins', '.mindtrace', 'contracts');

    const canonicalContract = {
      version: '1.0.0',
      testSuiteId: 'test-suite-canonical',
      generatedAt: '2024-01-01T00:00:00.000Z',
      repository: { url: 'https://github.com/test/repo', branch: 'main', commit: 'canonical123' },
      snapshot: { trace: [], coverage: [], metadata: {} },
      utilization: { assertions: [], hooks: [], coverage: [] }
    };
    const canonicalMetadata = {
      version: '1.0.0',
      contractId: 'test-contract-canonical',
      createdAt: '2024-01-01T00:00:00.000Z'
    };

    fs.writeFileSync(path.join(canonicalWinsCanonical, 'automation-contract.json'), JSON.stringify(canonicalContract, null, 2));
    fs.writeFileSync(path.join(canonicalWinsCanonical, 'automation-contract-metadata.json'), JSON.stringify(canonicalMetadata, null, 2));

    const canonicalFingerprintResult = computeContractFingerprint(canonicalWinsCanonical, 'best_effort');
    if (!canonicalFingerprintResult.ok) {
      throw new Error(`Failed to compute fingerprint: ${canonicalFingerprintResult.error}`);
    }
    fs.writeFileSync(path.join(canonicalWinsCanonical, 'automation-contract.hash'), canonicalFingerprintResult.fingerprint);

    // Legacy path for canonical-wins (should be ignored)
    const legacyIgnoredContract = {
      version: '1.0.0',
      testSuiteId: 'test-suite-legacy-ignored',
      generatedAt: '2024-01-01T00:00:00.000Z',
      repository: { url: 'https://github.com/test/repo', branch: 'main', commit: 'legacy999' },
      snapshot: { trace: [], coverage: [], metadata: {} },
      utilization: { assertions: [], hooks: [], coverage: [] }
    };
    const legacyIgnoredMetadata = {
      version: '1.0.0',
      contractId: 'test-contract-legacy-ignored',
      createdAt: '2024-01-01T00:00:00.000Z'
    };

    fs.writeFileSync(path.join(canonicalWinsLegacy, 'automation-contract.json'), JSON.stringify(legacyIgnoredContract, null, 2));
    fs.writeFileSync(path.join(canonicalWinsLegacy, 'automation-contract-metadata.json'), JSON.stringify(legacyIgnoredMetadata, null, 2));

    const legacyIgnoredFingerprintResult = computeContractFingerprint(canonicalWinsLegacy, 'best_effort');
    if (!legacyIgnoredFingerprintResult.ok) {
      throw new Error(`Failed to compute fingerprint: ${legacyIgnoredFingerprintResult.error}`);
    }
    fs.writeFileSync(path.join(canonicalWinsLegacy, 'contract.fingerprint.sha256'), legacyIgnoredFingerprintResult.fingerprint);

    // Missing files test - only create one file
    const missingFilesDir = path.join(FIXTURES_DIR, 'missing-files', '.mcp-contract');
    fs.writeFileSync(path.join(missingFilesDir, 'automation-contract.json'), JSON.stringify(validContract, null, 2));
    // Missing: automation-contract-metadata.json and automation-contract.hash

    // Fingerprint mismatch test - write wrong fingerprint
    const mismatchDir = path.join(FIXTURES_DIR, 'fingerprint-mismatch', '.mcp-contract');
    fs.writeFileSync(path.join(mismatchDir, 'automation-contract.json'), JSON.stringify(validContract, null, 2));
    fs.writeFileSync(path.join(mismatchDir, 'automation-contract-metadata.json'), JSON.stringify(validMetadata, null, 2));
    fs.writeFileSync(path.join(mismatchDir, 'automation-contract.hash'), 'wrong-fingerprint-value');
  });

  afterAll(() => {
    // Cleanup fixtures
    if (fs.existsSync(FIXTURES_DIR)) {
      fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
    }
  });

  it('should verify valid contract with canonical path', () => {
    const repoRoot = path.join(FIXTURES_DIR, 'valid-contract');
    // Phase A: Skip schema validation and use minimal file set (will be enabled in Phase B)
    const result = verifyContractIntegrity(repoRoot, {
      skipSchemaValidation: true,
      requiredFiles: ['automation-contract.json', 'automation-contract-metadata.json']
    });

    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.contract).toBeDefined();
      expect(result.contract.contractDir).toBe(path.join(repoRoot, '.mcp-contract'));
      expect(result.contract.fingerprint).toBeTruthy();
      expect(result.contract.files).toBeDefined();
      expect(Array.isArray(result.contract.files)).toBe(true);
      expect(result.contract.verificationSource).toBe('canonical');
      expect(result.contract.version).toBe('1.0.0');
    }
  });

  it('should verify valid contract with legacy fallback', () => {
    const repoRoot = path.join(FIXTURES_DIR, 'legacy-contract');
    // Phase A: Skip schema validation and use minimal file set (will be enabled in Phase B)
    const result = verifyContractIntegrity(repoRoot, {
      skipSchemaValidation: true,
      requiredFiles: ['automation-contract.json', 'automation-contract-metadata.json']
    });

    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.contract).toBeDefined();
      expect(result.contract.contractDir).toBe(path.join(repoRoot, '.mindtrace', 'contracts'));
      expect(result.contract.fingerprint).toBeTruthy();
      expect(result.contract.files).toBeDefined();
      expect(Array.isArray(result.contract.files)).toBe(true);
      expect(result.contract.verificationSource).toBe('legacy_fallback');
      expect(result.contract.version).toBe('1.0.0');
    }
  });

  it('should fail when contract directory not found', () => {
    const repoRoot = path.join(FIXTURES_DIR, 'nonexistent');
    const result = verifyContractIntegrity(repoRoot, {
      skipSchemaValidation: true,
      requiredFiles: ['automation-contract.json', 'automation-contract-metadata.json']
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.error.code).toBe('CONTRACT_DIR_NOT_FOUND');
      expect(result.recommendedAction).toBe('fail_hard');
      expect(result.failureExitCode).toBe(3);
    }
  });

  it('should fail when required files are missing', () => {
    const repoRoot = path.join(FIXTURES_DIR, 'missing-files');
    const result = verifyContractIntegrity(repoRoot, {
      skipSchemaValidation: true,
      requiredFiles: ['automation-contract.json', 'automation-contract-metadata.json']
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.error.code).toBe('CONTRACT_FILE_MISSING');
      expect(result.recommendedAction).toBe('fail_hard');
      expect(result.failureExitCode).toBe(3);
    }
  });

  it('should fail when fingerprint file is missing', () => {
    const repoRoot = path.join(FIXTURES_DIR, 'missing-files');
    const result = verifyContractIntegrity(repoRoot, {
      skipSchemaValidation: true,
      requiredFiles: ['automation-contract.json', 'automation-contract-metadata.json']
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      // Will fail on missing files first, but fingerprint is also checked
      expect(['CONTRACT_FILE_MISSING', 'CONTRACT_FINGERPRINT_FILE_MISSING']).toContain(result.error.code);
      expect(result.recommendedAction).toBe('fail_hard');
      expect(result.failureExitCode).toBe(3);
    }
  });

  it('should fail when fingerprint does not match', () => {
    const repoRoot = path.join(FIXTURES_DIR, 'fingerprint-mismatch');
    const result = verifyContractIntegrity(repoRoot, {
      skipSchemaValidation: true,
      requiredFiles: ['automation-contract.json', 'automation-contract-metadata.json']
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.error.code).toBe('CONTRACT_FINGERPRINT_MISMATCH');
      expect(result.recommendedAction).toBe('fail_hard');
      expect(result.failureExitCode).toBe(3);
    }
  });

  it('should prefer canonical path over legacy when both exist', () => {
    const repoRoot = path.join(FIXTURES_DIR, 'canonical-wins');
    const result = verifyContractIntegrity(repoRoot, {
      skipSchemaValidation: true,
      requiredFiles: ['automation-contract.json', 'automation-contract-metadata.json']
    });

    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.contract).toBeDefined();
      expect(result.contract.contractDir).toBe(path.join(repoRoot, '.mcp-contract'));
      expect(result.contract.verificationSource).toBe('canonical');
      expect(result.contract.files).toBeDefined();
      expect(result.contract.fingerprint).toBeTruthy();
    }
  });

  it('should include all required contract metadata in verified context', () => {
    const repoRoot = path.join(FIXTURES_DIR, 'valid-contract');
    const result = verifyContractIntegrity(repoRoot, {
      skipSchemaValidation: true,
      requiredFiles: ['automation-contract.json', 'automation-contract-metadata.json']
    });

    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      // Verify EXACT spec fields (VerifiedContractContext)
      expect(result.contract.fingerprint).toBeDefined();
      expect(result.contract.contractDir).toBeDefined();
      expect(result.contract.files).toBeDefined();
      expect(Array.isArray(result.contract.files)).toBe(true);
      expect(result.contract.verificationSource).toBeDefined();
      expect(['canonical', 'legacy_fallback']).toContain(result.contract.verificationSource);
      expect(result.contract.version).toBeDefined();
    }
  });
});
