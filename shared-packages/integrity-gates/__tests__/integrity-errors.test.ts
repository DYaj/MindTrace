// __tests__/integrity-errors.test.ts
import { describe, it, expect } from 'vitest';
import {
  IntegrityGateError,
  ContractIntegrityError,
  CacheIntegrityError
} from '../src/integrity-errors';

describe('Integrity Errors', () => {
  it('should create ContractIntegrityError with exit code 3', () => {
    const error = new ContractIntegrityError(
      'CONTRACT_FILE_MISSING',
      'Required file missing',
      { contractDir: '/repo/.mcp-contract', missingFile: 'automation-contract.json' }
    );

    expect(error).toBeInstanceOf(IntegrityGateError);
    expect(error.code).toBe('CONTRACT_FILE_MISSING');
    expect(error.message).toContain('Required file missing');
    expect(error.context.contractDir).toBe('/repo/.mcp-contract');
    expect(error.severity).toBe('fatal');
    expect(error.classification).toBe('contract');
    expect(error.failureExitCode).toBe(3);
    expect(error.recommendedAction).toBe('fail_hard');
  });

  it('should create CacheIntegrityError for strict mode with required cache', () => {
    const error = new CacheIntegrityError(
      'CACHE_HASH_MISMATCH',
      'Cache drift detected',
      { expectedHash: 'abc123', actualHash: 'def456' },
      'strict',
      true
    );

    expect(error.code).toBe('CACHE_HASH_MISMATCH');
    expect(error.severity).toBe('fatal');
    expect(error.classification).toBe('cache');
    expect(error.recommendedAction).toBe('fail_hard');
    expect(error.failureExitCode).toBe(3);
  });

  it('should create CacheIntegrityError for default mode as recoverable', () => {
    const error = new CacheIntegrityError(
      'CACHE_HASH_MISMATCH',
      'Cache drift detected',
      { expectedHash: 'abc123', actualHash: 'def456' },
      'default',
      false
    );

    expect(error.severity).toBe('recoverable');
    expect(error.recommendedAction).toBe('continue_without_cache');
    expect(error.failureExitCode).toBeUndefined();
  });

  it('should create CacheIntegrityError for strict mode with optional cache', () => {
    const error = new CacheIntegrityError(
      'CACHE_DIR_NOT_FOUND',
      'Cache missing',
      { cacheDir: '/repo/.mcp-cache/v1' },
      'strict',
      false // cache not required for path
    );

    expect(error.severity).toBe('recoverable');
    expect(error.recommendedAction).toBe('continue_without_cache');
    expect(error.failureExitCode).toBeUndefined();
  });
});
