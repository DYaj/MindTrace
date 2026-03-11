import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GuardedRuntimeWriter, GuardedAdvisoryWriter, initializeGuardedWriters } from '../src/guarded-writers';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';

describe('Guarded Artifact Writers Integration', () => {
  const testDir = 'test-guarded-runs';
  const runDir = `${testDir}/run_test`;

  beforeEach(() => {
    mkdirSync(`${runDir}/artifacts/runtime`, { recursive: true });
    mkdirSync(`${runDir}/artifacts/advisory`, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('GuardedRuntimeWriter', () => {
    it('should write authoritative artifacts with filesystem guard', () => {
      const { runtimeWriter } = initializeGuardedWriters(runDir);

      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "authoritative" as const,
        runId: "run_test",
        decision: "pass" as const,
        timestamp: "2026-03-10T10:00:00Z"
      };

      runtimeWriter.writeRuntimeArtifact(artifact, 'policy-decision', 'policy.json');

      const filePath = `${runDir}/artifacts/runtime/policy.json`;
      expect(existsSync(filePath)).toBe(true);

      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(content.artifactClass).toBe('authoritative');
    });

    it('should prevent runtime writer from writing to advisory directory', () => {
      const { runtimeWriter } = initializeGuardedWriters(runDir);

      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "authoritative" as const,
        runId: "run_test",
        decision: "pass" as const,
        timestamp: "2026-03-10T10:00:00Z"
      };

      // Try to trick it by providing advisory path
      expect(() => {
        (runtimeWriter as any).writeToPath(
          artifact,
          'policy-decision',
          `${runDir}/artifacts/advisory/evil.json`
        );
      }).toThrow('FILESYSTEM_GUARD_VIOLATION');
    });
  });

  describe('GuardedAdvisoryWriter', () => {
    it('should write advisory artifacts with filesystem guard', () => {
      const { advisoryWriter } = initializeGuardedWriters(runDir);

      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "advisory" as const,
        runId: "run_test",
        category: "selector_failed" as const,
        confidence: 0.95,
        isFlaky: false,
        summary: "Test summary",
        recommendations: ["Fix selector"]
      };

      advisoryWriter.writeAdvisoryArtifact(artifact, 'rca-report', 'rca.json');

      const filePath = `${runDir}/artifacts/advisory/rca.json`;
      expect(existsSync(filePath)).toBe(true);

      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(content.artifactClass).toBe('advisory');
    });

    it('should prevent advisory writer from writing to runtime directory', () => {
      const { advisoryWriter } = initializeGuardedWriters(runDir);

      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "advisory" as const,
        runId: "run_test",
        category: "selector_failed" as const,
        confidence: 0.8,
        isFlaky: false,
        summary: "Test",
        recommendations: []
      };

      // Try to trick it by providing runtime path
      expect(() => {
        (advisoryWriter as any).writeToPath(
          artifact,
          'rca-report',
          `${runDir}/artifacts/runtime/evil.json`
        );
      }).toThrow('FILESYSTEM_GUARD_VIOLATION');
    });
  });

  describe('Cross-directory Protection', () => {
    it('should enforce directory separation at filesystem level', () => {
      const { runtimeWriter, advisoryWriter } = initializeGuardedWriters(runDir);

      const authArtifact = {
        schemaVersion: "1.0",
        artifactClass: "authoritative" as const,
        runId: "run_test",
        decision: "pass" as const,
        timestamp: "2026-03-10T10:00:00Z"
      };

      const advisoryArtifact = {
        schemaVersion: "1.0",
        artifactClass: "advisory" as const,
        runId: "run_test",
        category: "selector_failed" as const,
        confidence: 0.9,
        isFlaky: false,
        summary: "Test",
        recommendations: []
      };

      // Each writer can only write to its designated directory
      runtimeWriter.writeRuntimeArtifact(authArtifact, 'policy-decision', 'policy.json');
      advisoryWriter.writeAdvisoryArtifact(advisoryArtifact, 'rca-report', 'rca.json');

      expect(existsSync(`${runDir}/artifacts/runtime/policy.json`)).toBe(true);
      expect(existsSync(`${runDir}/artifacts/advisory/rca.json`)).toBe(true);

      // Neither exists in the wrong directory
      expect(existsSync(`${runDir}/artifacts/runtime/rca.json`)).toBe(false);
      expect(existsSync(`${runDir}/artifacts/advisory/policy.json`)).toBe(false);
    });
  });
});
