import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdvisoryArtifactWriter } from '../src/advisory-writer.js';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';

describe('AdvisoryArtifactWriter', () => {
  const testRunDir = 'test-runs/advisory-test';
  const advisoryPath = `${testRunDir}/artifacts/advisory`;

  beforeEach(() => {
    mkdirSync(advisoryPath, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRunDir)) {
      rmSync(testRunDir, { recursive: true, force: true });
    }
  });

  it('should write advisory artifact to advisory directory', () => {
    const writer = new AdvisoryArtifactWriter(testRunDir);

    const artifact = {
      schemaVersion: "1.0",
      artifactClass: "advisory",
      runId: "run_test",
      category: "selector_failed",
      confidence: 0.92,
      isFlaky: false,
      summary: "Test RCA summary",
      recommendations: ["Fix selector"]
    };

    writer.writeAdvisoryArtifact(artifact, 'rca-report', 'rca-report.json');

    const filePath = `${advisoryPath}/rca-report.json`;
    expect(existsSync(filePath)).toBe(true);

    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content.artifactClass).toBe('advisory');
  });

  it('should reject authoritative artifact in advisory writer', () => {
    const writer = new AdvisoryArtifactWriter(testRunDir);

    const wrongArtifact = {
      schemaVersion: "1.0",
      artifactClass: "authoritative",  // Wrong class
      runId: "run_test",
      summary: "Test"
    };

    expect(() => {
      writer.writeAdvisoryArtifact(wrongArtifact as any, 'rca-report', 'test.json');
    }).toThrow();
  });

  it('should ensure artifactClass is advisory', () => {
    const writer = new AdvisoryArtifactWriter(testRunDir);

    const artifact = {
      schemaVersion: "1.0",
      artifactClass: "advisory",
      runId: "run_test",
      category: "selector_failed",
      confidence: 0.85,
      isFlaky: false,
      summary: "Metadata test",
      recommendations: []
    };

    writer.writeAdvisoryArtifact(artifact, 'rca-report', 'metadata-test.json');

    const content = JSON.parse(readFileSync(`${advisoryPath}/metadata-test.json`, 'utf-8'));
    expect(content.artifactClass).toBe('advisory');
    expect(content.schemaVersion).toBeDefined();
  });
});
