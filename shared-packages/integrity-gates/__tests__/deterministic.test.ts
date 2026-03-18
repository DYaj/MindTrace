// __tests__/deterministic.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { canonicalStringify, computeContractFingerprint, toPosix } from '../src/deterministic';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('Deterministic Helpers', () => {
  const testDir = join(process.cwd(), '__tests__/fixtures/deterministic-test');

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

  describe('canonicalStringify', () => {
    it('should produce deterministic JSON with sorted keys', () => {
      const obj1 = { b: 2, a: 1, nested: { z: 26, y: 25 } };
      const obj2 = { a: 1, b: 2, nested: { y: 25, z: 26 } };

      const result1 = canonicalStringify(obj1);
      const result2 = canonicalStringify(obj2);

      expect(result1).toBe(result2);
      expect(result1).toContain('"a": 1');
      expect(result1).toContain('"b": 2');
      expect(result1.indexOf('"a"')).toBeLessThan(result1.indexOf('"b"'));
    });

    it('should handle arrays deterministically', () => {
      const obj = { items: [3, 1, 2], name: 'test' };
      const result = canonicalStringify(obj);

      expect(result).toContain('"items": [');
      expect(result).toContain('"name": "test"');
    });
  });

  describe('toPosix', () => {
    it('should convert Windows paths to POSIX', () => {
      expect(toPosix('C:\\foo\\bar')).toBe('C:/foo/bar');
      // Note: Multiple slashes are normalized to single slash
      expect(toPosix('\\\\server\\share')).toBe('/server/share');
    });

    it('should normalize paths correctly', () => {
      expect(toPosix('/foo/bar')).toBe('/foo/bar');
      // Note: Leading ./ is stripped per repo-intelligence-mcp normalization
      expect(toPosix('./foo/bar')).toBe('foo/bar');
    });
  });

  describe('computeContractFingerprint', () => {
    it('should compute SHA256 fingerprint for valid contract', () => {
      // Create test contract files
      const contractFiles = {
        'automation-contract.json': { framework: 'playwright', version: '1.0.0' },
        'framework-pattern.json': { pattern: 'bdd' },
        'selector-strategy.json': { strategy: 'data-testid' }
      };

      Object.entries(contractFiles).forEach(([filename, content]) => {
        writeFileSync(join(testDir, filename), JSON.stringify(content, null, 2));
      });

      const result = computeContractFingerprint(testDir, 'best_effort');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
        expect(result.files.length).toBeGreaterThan(0);
      }
    });

    it('should fail in strict mode with missing files', () => {
      const emptyDir = join(testDir, 'empty');
      mkdirSync(emptyDir, { recursive: true });

      const result = computeContractFingerprint(emptyDir, 'strict');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Missing required files');
      }
    });

    it('should succeed in best_effort mode with partial files', () => {
      const partialDir = join(testDir, 'partial');
      mkdirSync(partialDir, { recursive: true });
      writeFileSync(
        join(partialDir, 'automation-contract.json'),
        JSON.stringify({ framework: 'playwright' })
      );

      const result = computeContractFingerprint(partialDir, 'best_effort');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.files).toContain('automation-contract.json');
      }
    });
  });
});
