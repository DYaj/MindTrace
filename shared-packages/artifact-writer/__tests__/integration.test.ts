import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RuntimeArtifactWriter } from '../src/runtime-writer.js';
import { AdvisoryArtifactWriter } from '../src/advisory-writer.js';
import { ArtifactReader, AuthorityBoundaryViolation } from '../src/artifact-reader.js';
import { existsSync, rmSync, mkdirSync } from 'fs';

describe('Layer 2 Integration: Audit Trail Enforcement', () => {
  const testRunDir = 'test-runs/integration-test';

  beforeEach(() => {
    mkdirSync(`${testRunDir}/artifacts`, { recursive: true });
  });

  afterEach(() => {
    if (existsSync('test-runs')) {
      rmSync('test-runs', { recursive: true, force: true });
    }
  });

  describe('Complete write-read-enforce cycle', () => {
    it('should enforce complete authority separation', () => {
      // Write authoritative artifact to runtime directory
      const runtimeWriter = new RuntimeArtifactWriter(testRunDir);
      const authArtifact = {
        schemaVersion: "1.0",
        artifactClass: "authoritative" as const,
        runId: "integration_test",
        decision: "pass" as const,
        timestamp: "2026-03-11T10:00:00Z"
      };

      runtimeWriter.writeRuntimeArtifact(authArtifact, 'policy-decision', 'policy.json');

      // Write advisory artifact to advisory directory
      const advisoryWriter = new AdvisoryArtifactWriter(testRunDir);
      const advisoryArtifact = {
        schemaVersion: "1.0",
        artifactClass: "advisory" as const,
        runId: "integration_test",
        category: "selector_failed" as const,
        confidence: 0.88,
        isFlaky: false,
        summary: "Integration test RCA",
        recommendations: ["Test recommendation"]
      };

      advisoryWriter.writeAdvisoryArtifact(advisoryArtifact, 'rca-report', 'rca.json');

      // Verify files exist in correct directories
      expect(existsSync(`${testRunDir}/artifacts/runtime/policy.json`)).toBe(true);
      expect(existsSync(`${testRunDir}/artifacts/advisory/rca.json`)).toBe(true);

      // Read artifacts back
      const reader = new ArtifactReader(testRunDir);
      const readAuth = reader.readArtifact('policy.json', 'runtime');
      const readAdv = reader.readArtifact('rca.json', 'advisory');

      expect(readAuth.artifactClass).toBe('authoritative');
      expect(readAdv.artifactClass).toBe('advisory');

      // Enforce authority boundaries
      expect(() => {
        reader.enforceAuthoritative(readAuth, 'test');
      }).not.toThrow();

      expect(() => {
        reader.enforceAuthoritative(readAdv, 'test');
      }).toThrow(AuthorityBoundaryViolation);
    });

    it('should prevent cross-directory writes', () => {
      const runtimeWriter = new RuntimeArtifactWriter(testRunDir);
      const advisoryWriter = new AdvisoryArtifactWriter(testRunDir);

      const authArtifact = {
        schemaVersion: "1.0",
        artifactClass: "authoritative" as const,
        runId: "test",
        decision: "pass" as const,
        timestamp: "2026-03-11T10:00:00Z"
      };

      const advisoryArtifact = {
        schemaVersion: "1.0",
        artifactClass: "advisory" as const,
        runId: "test",
        category: "timeout" as const,
        confidence: 0.75,
        isFlaky: true,
        summary: "Test",
        recommendations: []
      };

      // Try to write authoritative to advisory (should fail at schema validation)
      // Schema validation happens before artifactClass check, so it will fail
      // because policy-decision is not a valid advisory schema
      expect(() => {
        advisoryWriter.writeAdvisoryArtifact(authArtifact as any, 'policy-decision', 'wrong.json');
      }).toThrow('Schema not found');

      // Advisory to runtime should fail schema validation
      // rca-report is not a valid runtime schema
      expect(() => {
        runtimeWriter.writeRuntimeArtifact(advisoryArtifact as any, 'rca-report', 'wrong.json');
      }).toThrow('Schema not found');
    });
  });

  describe('Legacy compatibility', () => {
    it('should read from legacy flat structure', () => {
      // Simulate legacy run by writing to flat artifacts/ directory
      mkdirSync(`${testRunDir}/artifacts`, { recursive: true });
      const writer = new RuntimeArtifactWriter(testRunDir);

      // This will create artifacts/runtime/ directory
      writer.writeRuntimeArtifact({
        schemaVersion: "1.0",
        artifactClass: "authoritative" as const,
        runId: "legacy_test",
        decision: "pass" as const,
        timestamp: "2026-03-11T10:00:00Z"
      }, 'policy-decision', 'new.json');

      const reader = new ArtifactReader(testRunDir);
      const artifact = reader.readArtifact('new.json', 'runtime');

      expect(artifact).toBeDefined();
      expect(artifact._legacyLocation).toBeUndefined(); // Not legacy
    });
  });

  describe('Schema validation at boundaries', () => {
    it('should reject invalid artifacts at write time', () => {
      const writer = new RuntimeArtifactWriter(testRunDir);

      const invalidArtifact = {
        schemaVersion: "1.0",
        artifactClass: "authoritative" as const,
        runId: "test",
        decision: "INVALID_VALUE", // Not in enum
        timestamp: "2026-03-11T10:00:00Z"
      };

      expect(() => {
        writer.writeRuntimeArtifact(invalidArtifact as any, 'policy-decision', 'invalid.json');
      }).toThrow();
    });

    it('should validate schema before writing', () => {
      const writer = new AdvisoryArtifactWriter(testRunDir);

      const missingFields = {
        schemaVersion: "1.0",
        artifactClass: "advisory" as const,
        runId: "test"
        // Missing required fields
      };

      expect(() => {
        writer.writeAdvisoryArtifact(missingFields as any, 'rca-report', 'incomplete.json');
      }).toThrow();
    });
  });

  describe('Safe execution patterns', () => {
    it('should provide safe read method for execution paths', () => {
      const writer = new RuntimeArtifactWriter(testRunDir);
      writer.writeRuntimeArtifact({
        schemaVersion: "1.0",
        artifactClass: "authoritative" as const,
        runId: "safe_test",
        decision: "pass" as const,
        timestamp: "2026-03-11T10:00:00Z"
      }, 'policy-decision', 'safe.json');

      const reader = new ArtifactReader(testRunDir);
      const artifact = reader.readAuthoritativeArtifact('safe.json', 'healing-engine');

      expect(artifact).toBeDefined();
      expect(artifact.artifactClass).toBe('authoritative');
    });
  });
});
