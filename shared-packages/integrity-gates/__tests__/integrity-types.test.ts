// __tests__/integrity-types.test.ts
import { describe, it, expect } from 'vitest';
import type {
  IntegrityMode,
  VerifiedContractContext,
  ContractIntegrityResult,
  CacheIntegrityResult,
  DriftDetectionResult
} from '../src/integrity-types';

describe('Integrity Types', () => {
  it('should allow valid IntegrityMode values', () => {
    const defaultMode: IntegrityMode = 'default';
    const strictMode: IntegrityMode = 'strict';

    expect(defaultMode).toBe('default');
    expect(strictMode).toBe('strict');
  });

  it('should define VerifiedContractContext structure', () => {
    const context: VerifiedContractContext = {
      fingerprint: 'abc123',
      contractDir: '/repo/.mcp-contract',
      files: ['automation-contract.json'],
      verificationSource: 'canonical',
      version: '1.0.0'
    };

    expect(context.fingerprint).toBe('abc123');
    expect(context.verificationSource).toBe('canonical');
  });

  it('should define valid ContractIntegrityResult', () => {
    const validResult: ContractIntegrityResult = {
      status: 'valid',
      contract: {
        fingerprint: 'abc123',
        contractDir: '/repo/.mcp-contract',
        files: [],
        verificationSource: 'canonical',
        version: '1.0.0'
      }
    };

    expect(validResult.status).toBe('valid');
  });

  it('should define valid CacheIntegrityResult', () => {
    const validResult: CacheIntegrityResult = {
      status: 'valid',
      cache: {
        cacheDir: '/repo/.mcp-cache/v1',
        contractBinding: 'abc123',
        cacheVersion: '0.1.0',
        pageCount: 5,
        mode: 'default',
        cacheRequiredForPath: false
      }
    };

    expect(validResult.status).toBe('valid');
  });

  it('should define DriftDetectionResult with no drift', () => {
    const noDrift: DriftDetectionResult = {
      drift: false,
      currentFingerprint: 'abc123',
      cacheBinding: 'abc123'
    };

    expect(noDrift.drift).toBe(false);
  });

  it('should define DriftDetectionResult with drift', () => {
    const drifted: DriftDetectionResult = {
      drift: true,
      currentFingerprint: 'def456',
      previousHash: 'abc123',
      currentHash: 'def456',
      driftType: 'hash_mismatch',
      code: 'CACHE_HASH_MISMATCH'
    };

    expect(drifted.drift).toBe(true);
    expect(drifted.driftType).toBe('hash_mismatch');
  });

  it('should define invalid ContractIntegrityResult', () => {
    const invalidResult: ContractIntegrityResult = {
      status: 'invalid',
      error: new Error('Contract verification failed'),
      recommendedAction: 'fail_hard',
      failureExitCode: 3
    };

    expect(invalidResult.status).toBe('invalid');
    expect(invalidResult.failureExitCode).toBe(3);
  });

  it('should define invalid CacheIntegrityResult with drift reason', () => {
    const invalidResult: CacheIntegrityResult = {
      status: 'invalid',
      reason: {
        type: 'drift',
        driftType: 'hash_mismatch',
        expectedHash: 'abc123',
        actualHash: 'def456',
        code: 'CACHE_HASH_MISMATCH'
      },
      required: false,
      recommendedAction: 'continue_without_cache'
    };

    expect(invalidResult.status).toBe('invalid');
    expect(invalidResult.reason.type).toBe('drift');
  });

  it('should narrow ContractIntegrityResult type based on status', () => {
    const result: ContractIntegrityResult = {
      status: 'valid',
      contract: {
        fingerprint: 'abc123',
        contractDir: '/repo/.mcp-contract',
        files: [],
        verificationSource: 'canonical',
        version: '1.0.0'
      }
    };

    if (result.status === 'valid') {
      expect(result.contract.fingerprint).toBe('abc123');
    } else {
      expect(result.failureExitCode).toBe(3);
    }
  });
});
