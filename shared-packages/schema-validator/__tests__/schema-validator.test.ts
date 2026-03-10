import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '../src/schema-validator.js';

describe('SchemaValidator', () => {
  it('should validate authoritative artifact', () => {
    const validator = new SchemaValidator();
    const artifact = {
      schemaVersion: "1.0",
      artifactClass: "authoritative",
      runId: "run_1",
      decision: "pass",
      timestamp: "2026-03-10T10:00:00Z"
    };

    const result = validator.validateAuthoritative(artifact, 'policy-decision');

    expect(result.valid).toBe(true);
  });
});
