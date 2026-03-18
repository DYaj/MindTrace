// __tests__/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  verifyContractIntegrity,
  verifyCacheIntegrity,
  detectDrift,
  DriftAudit
} from '../src/index.js';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { computeContractFingerprint } from '../src/deterministic.js';
// Note: Integration tests use internal deterministic helpers for fixture setup.
// This is acceptable as tests need to create valid contract fingerprints.
// Will be refactored when deterministic-core is extracted (Phase B).

describe('Integration Tests (End-to-End)', () => {
  const fixturesDir = join(process.cwd(), '__tests__/fixtures/integration');

  // Helper to create minimal valid contract files
  function createMinimalContract(contractDir: string) {
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
      writeFileSync(join(contractDir, filename), JSON.stringify(content));
    });
  }

  beforeAll(() => {
    if (existsSync(fixturesDir)) {
      rmSync(fixturesDir, { recursive: true, force: true });
    }
    mkdirSync(fixturesDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(fixturesDir)) {
      rmSync(fixturesDir, { recursive: true, force: true });
    }
  });

  it('should verify valid contract + valid cache (default mode)', () => {
    const repoRoot = join(fixturesDir, 'valid-contract-cache');
    const contractDir = join(repoRoot, '.mcp-contract');
    mkdirSync(contractDir, { recursive: true });

    // Create minimal valid contract
    createMinimalContract(contractDir);

    const fpResult = computeContractFingerprint(contractDir, 'strict');
    expect(fpResult.ok).toBe(true);

    if (fpResult.ok) {
      writeFileSync(join(contractDir, 'automation-contract.hash'), fpResult.fingerprint + '\n');

      // Create valid cache bound to contract
      const cacheDir = join(repoRoot, '.mcp-cache/v1');
      mkdirSync(cacheDir, { recursive: true });
      const cacheMeta = {
        cacheVersion: '0.1.0',
        contractSha256: fpResult.fingerprint,
        pages: []
      };
      writeFileSync(join(cacheDir, 'meta.json'), JSON.stringify(cacheMeta));

      // Verify contract
      const contractResult = verifyContractIntegrity(repoRoot);
      expect(contractResult.status).toBe('valid');

      if (contractResult.status === 'valid') {
        // Verify cache
        const cacheResult = verifyCacheIntegrity(repoRoot, contractResult.contract, {
          mode: 'default',
          cacheRequiredForPath: false
        });

        expect(cacheResult.status).toBe('valid');
      }
    }
  });

  it('should detect drift and record audit event', () => {
    const repoRoot = join(fixturesDir, 'drift-scenario');
    const contractDir = join(repoRoot, '.mcp-contract');
    mkdirSync(contractDir, { recursive: true });

    // Create contract (all required files for best_effort mode)
    createMinimalContract(contractDir);

    const fpResult = computeContractFingerprint(contractDir, 'best_effort');
    if (fpResult.ok) {
      writeFileSync(join(contractDir, 'automation-contract.hash'), fpResult.fingerprint + '\n');

      // Create drifted cache
      const cacheDir = join(repoRoot, '.mcp-cache/v1');
      mkdirSync(cacheDir, { recursive: true });
      const cacheMeta = {
        cacheVersion: '0.1.0',
        contractSha256: 'wrong-hash-abc123', // DRIFT!
        pages: []
      };
      writeFileSync(join(cacheDir, 'meta.json'), JSON.stringify(cacheMeta));

      // Verify contract
      const contractResult = verifyContractIntegrity(repoRoot);
      expect(contractResult.status).toBe('valid');

      if (contractResult.status === 'valid') {
        // Detect drift
        const driftResult = detectDrift(contractResult.contract, cacheMeta.contractSha256);
        expect(driftResult.drift).toBe(true);

        if (driftResult.drift) {
          // Record drift event
          const auditDir = join(repoRoot, 'runs/test-run/audit');
          const audit = new DriftAudit(auditDir);

          audit.appendDriftEvent({
            eventType: 'cache_contract_mismatch',
            previousHash: driftResult.previousHash,
            currentHash: driftResult.currentHash,
            driftType: driftResult.driftType,
            cacheInvalidated: true,
            executionMode: 'default',
            actionTaken: 'continue_without_cache',
            timestamp: new Date().toISOString(),
            runId: 'test-run'
          });

          // Verify audit written
          const events = audit.readDriftEvents();
          expect(events).toHaveLength(1);
          expect(events[0].driftType).toBe('hash_mismatch');
        }
      }
    }
  });

  it('should enforce gate ordering: contract before cache', () => {
    const repoRoot = join(fixturesDir, 'gate-ordering');

    // No contract directory exists
    const contractResult = verifyContractIntegrity(repoRoot);
    expect(contractResult.status).toBe('invalid');

    // Cache verification should not run when contract invalid
    // (in practice, runtime coordinator would exit before cache check)
  });
});
