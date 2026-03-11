import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RuntimeArtifactWriter } from '../src/runtime-writer.js';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';

describe('RuntimeArtifactWriter', () => {
  const testRunDir = 'test-runs/run_test';
  const runtimePath = `${testRunDir}/artifacts/runtime`;

  beforeEach(() => {
    mkdirSync(runtimePath, { recursive: true });
  });

  afterEach(() => {
    if (existsSync('test-runs')) {
      rmSync('test-runs', { recursive: true });
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
});
