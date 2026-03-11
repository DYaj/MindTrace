import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RuntimeArtifactWriter } from '../src/runtime-writer.js';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';

describe('RuntimeArtifactWriter', () => {
  const testRunDir = 'test-runs/runtime-test';
  const runtimePath = `${testRunDir}/artifacts/runtime`;

  beforeEach(() => {
    mkdirSync(runtimePath, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRunDir)) {
      rmSync(testRunDir, { recursive: true, force: true });
    }
  });

  it('should write authoritative artifact to runtime directory', () => {
    const writer = new RuntimeArtifactWriter(testRunDir);

    const artifact = {
      schemaVersion: "1.0",
      artifactClass: "authoritative",
      runId: "run_test",
      decision: "pass",
      timestamp: "2026-03-10T10:00:00Z"
    };

    writer.writeRuntimeArtifact(artifact, 'policy-decision', 'policy-decision.json');

    const filePath = `${runtimePath}/policy-decision.json`;
    expect(existsSync(filePath)).toBe(true);

    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content.artifactClass).toBe('authoritative');
  });

  it('should ensure artifactClass is authoritative', () => {
    const writer = new RuntimeArtifactWriter(testRunDir);

    const artifact = {
      schemaVersion: "1.0",
      artifactClass: "authoritative",
      runId: "run_test",
      decision: "pass",
      timestamp: "2026-03-10T10:00:00Z"
    };

    writer.writeRuntimeArtifact(artifact, 'policy-decision', 'metadata-test.json');

    const content = JSON.parse(readFileSync(`${runtimePath}/metadata-test.json`, 'utf-8'));
    expect(content.artifactClass).toBe('authoritative');
    expect(content.schemaVersion).toBeDefined();
  });

  it('should reject artifact with wrong artifactClass', () => {
    const writer = new RuntimeArtifactWriter(testRunDir);

    const wrongArtifact = {
      schemaVersion: "1.0",
      artifactClass: "advisory",  // Wrong for runtime
      runId: "run_test",
      decision: "pass",
      timestamp: "2026-03-10T10:00:00Z"
    };

    expect(() => {
      writer.writeRuntimeArtifact(wrongArtifact as any, 'policy-decision', 'wrong.json');
    }).toThrow();
  });
});
