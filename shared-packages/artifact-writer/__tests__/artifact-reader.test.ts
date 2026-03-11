import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArtifactReader } from '../src/artifact-reader.js';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';

describe('ArtifactReader', () => {
  const testRunDir = 'test-runs/reader-test';

  afterEach(() => {
    if (existsSync('test-runs')) {
      rmSync('test-runs', { recursive: true, force: true });
    }
  });

  describe('New hierarchical structure', () => {
    beforeEach(() => {
      mkdirSync(`${testRunDir}/artifacts/runtime`, { recursive: true });
      mkdirSync(`${testRunDir}/artifacts/advisory`, { recursive: true });
    });

    it('should read artifact from new runtime directory', () => {
      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "authoritative",
        runId: "test_run",
        decision: "pass"
      };

      writeFileSync(
        `${testRunDir}/artifacts/runtime/policy.json`,
        JSON.stringify(artifact),
        'utf-8'
      );

      const reader = new ArtifactReader(testRunDir);
      const result = reader.readArtifact('policy.json', 'runtime');

      expect(result).toBeDefined();
      expect(result.artifactClass).toBe('authoritative');
      expect(result._legacyLocation).toBeUndefined();
    });

    it('should read artifact from new advisory directory', () => {
      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "advisory",
        runId: "test_run",
        summary: "RCA report"
      };

      writeFileSync(
        `${testRunDir}/artifacts/advisory/rca.json`,
        JSON.stringify(artifact),
        'utf-8'
      );

      const reader = new ArtifactReader(testRunDir);
      const result = reader.readArtifact('rca.json', 'advisory');

      expect(result).toBeDefined();
      expect(result.artifactClass).toBe('advisory');
    });

    it('should detect non-legacy run', () => {
      const reader = new ArtifactReader(testRunDir);
      expect(reader.isLegacyRun()).toBe(false);
    });
  });

  describe('Legacy flat structure', () => {
    beforeEach(() => {
      mkdirSync(`${testRunDir}/artifacts`, { recursive: true });
    });

    it('should fall back to legacy location', () => {
      const artifact = {
        schemaVersion: "1.0",
        runId: "legacy_run",
        decision: "pass"
      };

      writeFileSync(
        `${testRunDir}/artifacts/policy.json`,
        JSON.stringify(artifact),
        'utf-8'
      );

      const reader = new ArtifactReader(testRunDir);
      const result = reader.readArtifact('policy.json', 'runtime');

      expect(result).toBeDefined();
      expect(result._legacyLocation).toBe(true);
    });

    it('should detect legacy run', () => {
      const reader = new ArtifactReader(testRunDir);
      expect(reader.isLegacyRun()).toBe(true);
    });
  });

  describe('Missing artifacts', () => {
    it('should return null for missing artifact', () => {
      mkdirSync(`${testRunDir}/artifacts`, { recursive: true });

      const reader = new ArtifactReader(testRunDir);
      const result = reader.readArtifact('missing.json', 'runtime');

      expect(result).toBeNull();
    });
  });
});
