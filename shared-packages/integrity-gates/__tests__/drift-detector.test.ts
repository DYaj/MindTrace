/**
 * @file drift-detector.test.ts
 * @description Tests for pure drift detection logic (NO I/O, NO timestamps)
 *
 * Test cases:
 * 1. No drift when hashes match
 * 2. Drift when hashes mismatch
 * 3. Drift when binding field missing
 * 4. Deterministic - same inputs produce same outputs
 * 5. NO timestamps generated (pure function)
 */

import { detectDrift } from '../src/drift-detector';
import type { VerifiedContractContext } from '../src/integrity-types';

describe('detectDrift (pure logic)', () => {
  const mockContract: VerifiedContractContext = {
    fingerprint: 'abc123',
    contractDir: '.mcp-contract',
    files: ['automation-contract.json', 'automation-contract-metadata.json'],
    verificationSource: 'canonical',
    version: '0.1.0'
  };

  it('should detect NO drift when hashes match', () => {
    const cacheBinding = 'abc123'; // matches contract fingerprint

    const result = detectDrift(mockContract, cacheBinding);

    expect(result.drift).toBe(false);
    expect(result).toEqual({
      drift: false,
      currentFingerprint: 'abc123',
      cacheBinding: 'abc123'
    });
  });

  it('should detect drift when hashes mismatch', () => {
    const cacheBinding = 'xyz789'; // different hash

    const result = detectDrift(mockContract, cacheBinding);

    expect(result.drift).toBe(true);
    if (result.drift) {
      expect(result.driftType).toBe('hash_mismatch');
      expect(result.code).toBe('CACHE_HASH_MISMATCH');
      expect(result.currentFingerprint).toBe('abc123');
      expect(result.previousHash).toBe('xyz789');
      expect(result.currentHash).toBe('abc123');
    }
  });

  it('should detect drift when binding field missing', () => {
    const cacheBinding = undefined; // missing binding

    const result = detectDrift(mockContract, cacheBinding);

    expect(result.drift).toBe(true);
    if (result.drift) {
      expect(result.driftType).toBe('binding_missing');
      expect(result.code).toBe('CACHE_BINDING_MISSING');
      expect(result.currentFingerprint).toBe('abc123');
      expect(result.previousHash).toBe('<missing>');
      expect(result.currentHash).toBe('abc123');
    }
  });

  it('should be deterministic - same inputs produce same outputs', () => {
    const cacheBinding = 'xyz789';

    const result1 = detectDrift(mockContract, cacheBinding);
    const result2 = detectDrift(mockContract, cacheBinding);
    const result3 = detectDrift(mockContract, cacheBinding);

    // All results must be identical (deep equality)
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
    expect(result1).toEqual(result3);

    // Verify serialization is identical (no hidden state)
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    expect(JSON.stringify(result2)).toBe(JSON.stringify(result3));
  });

  it('should NOT generate timestamps (pure function)', () => {
    const cacheBinding = 'different';

    const result = detectDrift(mockContract, cacheBinding);

    // Verify result does NOT contain timestamp or date fields
    expect(result).not.toHaveProperty('timestamp');
    expect(result).not.toHaveProperty('detectedAt');
    expect(JSON.stringify(result)).not.toContain('20'); // No year strings (2024, 2025, etc.)
  });
});
