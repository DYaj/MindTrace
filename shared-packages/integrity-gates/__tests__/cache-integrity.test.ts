import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { verifyCacheIntegrity } from '../src/cache-integrity';
import { verifyContractIntegrity } from '../src/contract-integrity';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { computeContractFingerprint } from '../src/deterministic';

describe('Cache Integrity Gate', () => {
  const fixturesDir = join(process.cwd(), '__tests__/fixtures/cache-integrity');
  const validCacheDir = join(fixturesDir, 'valid-cache');
  const driftedCacheDir = join(fixturesDir, 'drifted-cache');

  let verifiedContract: any;

  beforeAll(() => {
    // Clean up
    if (existsSync(fixturesDir)) {
      rmSync(fixturesDir, { recursive: true, force: true });
    }

    // Create valid contract for all tests
    const contractDir = join(validCacheDir, '.mcp-contract');
    mkdirSync(contractDir, { recursive: true });

    const contractFiles = {
      'automation-contract.json': { framework: 'playwright' },
      'framework-pattern.json': { pattern: 'bdd' },
      'selector-strategy.json': { strategy: 'data-testid' },
      'assertion-style.json': { style: 'expect' },
      'page-key-policy.json': { policy: 'filename' },
      'repo-topology.json': { root: '/repo' },
      'wrapper-discovery.json': { wrappers: [] }
    };

    Object.entries(contractFiles).forEach(([filename, content]) => {
      writeFileSync(join(contractDir, filename), JSON.stringify(content, null, 2));
    });

    const fpResult = computeContractFingerprint(contractDir, 'strict');
    if (fpResult.ok) {
      writeFileSync(join(contractDir, 'automation-contract.hash'), fpResult.fingerprint + '\n');

      // Create valid cache bound to contract
      const cacheDir = join(validCacheDir, '.mcp-cache/v1');
      mkdirSync(cacheDir, { recursive: true });

      const cacheMeta = {
        cacheVersion: '0.1.0',
        contractSha256: fpResult.fingerprint,
        pages: [
          { pageId: 'login', sourcePath: 'pages/login.ts' },
          { pageId: 'dashboard', sourcePath: 'pages/dashboard.ts' }
        ]
      };

      writeFileSync(join(cacheDir, 'meta.json'), JSON.stringify(cacheMeta, null, 2));

      // Create drifted cache (wrong hash)
      const driftedContractDir = join(driftedCacheDir, '.mcp-contract');
      mkdirSync(driftedContractDir, { recursive: true });
      Object.entries(contractFiles).forEach(([filename, content]) => {
        writeFileSync(join(driftedContractDir, filename), JSON.stringify(content, null, 2));
      });
      writeFileSync(join(driftedContractDir, 'automation-contract.hash'), fpResult.fingerprint + '\n');

      const driftedCacheDirPath = join(driftedCacheDir, '.mcp-cache/v1');
      mkdirSync(driftedCacheDirPath, { recursive: true });
      const driftedCacheMeta = {
        cacheVersion: '0.1.0',
        contractSha256: 'old-hash-xyz789', // WRONG HASH
        pages: []
      };
      writeFileSync(join(driftedCacheDirPath, 'meta.json'), JSON.stringify(driftedCacheMeta, null, 2));
    }

    // Verify contract for tests
    const contractResult = verifyContractIntegrity(validCacheDir);
    if (contractResult.status === 'valid') {
      verifiedContract = contractResult.contract;
    }
  });

  afterAll(() => {
    if (existsSync(fixturesDir)) {
      rmSync(fixturesDir, { recursive: true, force: true });
    }
  });

  it('should verify valid cache with matching contract binding', () => {
    const result = verifyCacheIntegrity(validCacheDir, verifiedContract, {
      mode: 'default',
      cacheRequiredForPath: false
    });

    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.cache.contractBinding).toBe(verifiedContract.fingerprint);
      expect(result.cache.cacheVersion).toBe('0.1.0');
      expect(result.cache.pageCount).toBe(2);
    }
  });

  it('should return invalid with continue_without_cache for missing cache (default mode)', () => {
    const noCacheDir = join(fixturesDir, 'no-cache');
    mkdirSync(join(noCacheDir, '.mcp-contract'), { recursive: true });

    const result = verifyCacheIntegrity(noCacheDir, verifiedContract, {
      mode: 'default',
      cacheRequiredForPath: false
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.reason.type).toBe('missing');
      expect(result.recommendedAction).toBe('continue_without_cache');
      expect(result.failureExitCode).toBeUndefined();
    }
  });

  it('should return invalid with fail_hard for missing cache (strict mode, cache required)', () => {
    const noCacheDir = join(fixturesDir, 'no-cache-strict');
    mkdirSync(join(noCacheDir, '.mcp-contract'), { recursive: true });

    const result = verifyCacheIntegrity(noCacheDir, verifiedContract, {
      mode: 'strict',
      cacheRequiredForPath: true
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.recommendedAction).toBe('fail_hard');
      expect(result.failureExitCode).toBe(3);
    }
  });

  it('should detect drift with hash mismatch (default mode)', () => {
    const result = verifyCacheIntegrity(driftedCacheDir, verifiedContract, {
      mode: 'default',
      cacheRequiredForPath: false
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.reason.type).toBe('drift');
      if (result.reason.type === 'drift') {
        expect(result.reason.driftType).toBe('hash_mismatch');
        expect(result.reason.code).toBe('CACHE_HASH_MISMATCH');
      }
      expect(result.recommendedAction).toBe('continue_without_cache');
    }
  });

  it('should detect drift with fail_hard (strict mode, cache required)', () => {
    const result = verifyCacheIntegrity(driftedCacheDir, verifiedContract, {
      mode: 'strict',
      cacheRequiredForPath: true
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.recommendedAction).toBe('fail_hard');
      expect(result.failureExitCode).toBe(3);
    }
  });

  it('should allow drift with continue_without_cache (strict mode, cache optional)', () => {
    const result = verifyCacheIntegrity(driftedCacheDir, verifiedContract, {
      mode: 'strict',
      cacheRequiredForPath: false // Cache optional for this path
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.recommendedAction).toBe('continue_without_cache');
      expect(result.failureExitCode).toBeUndefined();
    }
  });
});
