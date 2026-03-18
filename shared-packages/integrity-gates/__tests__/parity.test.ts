// __tests__/parity.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { canonicalStringify, computeContractFingerprint, toPosix } from '../src/deterministic';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

// Import repo-intelligence-mcp for comparison
// NOTE: These imports may need adjustment based on actual repo-intelligence-mcp structure
import {
  canonicalStringify as repoCanonicalStringify
} from '../../../../../repo-intelligence-mcp/src/core/deterministic.js';

import {
  toPosix as repoToPosix
} from '../../../../../repo-intelligence-mcp/src/core/normalization.js';

import {
  computeContractFingerprint as repoComputeFingerprint
} from '../../../../../repo-intelligence-mcp/src/tools/fingerprintContract.js';

describe('Parity Tests (vs repo-intelligence-mcp)', () => {
  const testDir = join(process.cwd(), '__tests__/fixtures/parity-test');

  beforeAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('canonicalStringify parity', () => {
    it('should produce identical output to repo-intelligence-mcp', () => {
      const testCases = [
        { b: 2, a: 1, nested: { z: 26, y: 25 } },
        { items: [3, 1, 2], name: 'test' },
        { deep: { nested: { object: { value: 42 } } } },
        [1, 2, 3],
        { null: null, bool: true, num: 123.45 }
      ];

      testCases.forEach(testCase => {
        const integrityGatesResult = canonicalStringify(testCase);
        const repoIntelligenceResult = repoCanonicalStringify(testCase);

        expect(integrityGatesResult).toBe(repoIntelligenceResult);
      });
    });
  });

  describe('toPosix parity', () => {
    it('should normalize paths identically to repo-intelligence-mcp', () => {
      const testPaths = [
        'C:\\foo\\bar',
        '/foo/bar',
        './foo/../bar',
        '\\\\server\\share\\path',
        'relative/path/to/file.ts'
      ];

      testPaths.forEach(path => {
        const integrityGatesResult = toPosix(path);
        const repoIntelligenceResult = repoToPosix(path);

        expect(integrityGatesResult).toBe(repoIntelligenceResult);
      });
    });
  });

  describe('computeContractFingerprint parity', () => {
    it('should compute identical fingerprints to repo-intelligence-mcp', () => {
      // Create golden contract fixture
      const contractFiles = {
        'automation-contract.json': { framework: 'playwright', version: '1.0.0' },
        'framework-pattern.json': { pattern: 'bdd', style: 'cucumber' },
        'selector-strategy.json': { primary: 'data-testid', fallback: 'role' },
        'assertion-style.json': { library: 'expect', style: 'bdd' },
        'page-key-policy.json': { derivation: 'filename', separator: '-' },
        'repo-topology.json': { root: '/repo', testDir: 'tests' },
        'wrapper-discovery.json': { wrappers: ['page-wrapper.ts'] }
      };

      Object.entries(contractFiles).forEach(([filename, content]) => {
        writeFileSync(join(testDir, filename), JSON.stringify(content, null, 2));
      });

      // Compute fingerprint using integrity-gates
      const integrityGatesResult = computeContractFingerprint(testDir, 'strict');

      // Compute fingerprint using repo-intelligence-mcp
      const repoIntelligenceResult = repoComputeFingerprint(testDir, 'strict');

      // MUST MATCH EXACTLY
      expect(integrityGatesResult.ok).toBe(true);
      expect(repoIntelligenceResult.ok).toBe(true);

      if (integrityGatesResult.ok && repoIntelligenceResult.ok) {
        expect(integrityGatesResult.fingerprint).toBe(repoIntelligenceResult.fingerprint);
        expect(integrityGatesResult.files).toEqual(repoIntelligenceResult.files);
      }
    });

    it('should handle missing files identically in best_effort mode', () => {
      const partialDir = join(testDir, 'partial');
      mkdirSync(partialDir, { recursive: true });

      // Only create one file
      writeFileSync(
        join(partialDir, 'automation-contract.json'),
        JSON.stringify({ framework: 'playwright' })
      );

      const integrityGatesResult = computeContractFingerprint(partialDir, 'best_effort');
      const repoIntelligenceResult = repoComputeFingerprint(partialDir, 'best_effort');

      expect(integrityGatesResult.ok).toBe(true);
      expect(repoIntelligenceResult.ok).toBe(true);

      if (integrityGatesResult.ok && repoIntelligenceResult.ok) {
        expect(integrityGatesResult.fingerprint).toBe(repoIntelligenceResult.fingerprint);
      }
    });

    it('should fail identically in strict mode with missing files', () => {
      const emptyDir = join(testDir, 'empty');
      mkdirSync(emptyDir, { recursive: true });

      const integrityGatesResult = computeContractFingerprint(emptyDir, 'strict');
      const repoIntelligenceResult = repoComputeFingerprint(emptyDir, 'strict');

      expect(integrityGatesResult.ok).toBe(false);
      expect(repoIntelligenceResult.ok).toBe(false);

      // Error messages should match
      if (!integrityGatesResult.ok && !repoIntelligenceResult.ok) {
        expect(integrityGatesResult.error).toContain('Missing required files');
        expect(repoIntelligenceResult.error).toContain('Missing required files');
      }
    });
  });
});
