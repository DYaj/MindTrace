import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '../src/schema-validator.js';
import { SchemaValidationError } from '../src/errors.js';

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

  it('should reject invalid authoritative artifact with clear errors', () => {
    const validator = new SchemaValidator();
    const invalidArtifact = {
      schemaVersion: "1.0",
      artifactClass: "WRONG_CLASS",  // Should be "authoritative"
      runId: "run_1"
      // missing required fields
    };

    const result = validator.validateAuthoritative(invalidArtifact, 'policy-decision');

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('should throw SchemaValidationError on rejectInvalid', () => {
    const validator = new SchemaValidator();
    const invalidArtifact = { invalid: true };

    expect(() => {
      validator.rejectInvalid(invalidArtifact, 'policy-decision', 'authoritative');
    }).toThrow(SchemaValidationError);
  });

  it('should include exit code 3 in error', () => {
    const validator = new SchemaValidator();
    const invalidArtifact = { invalid: true };

    try {
      validator.rejectInvalid(invalidArtifact, 'policy-decision', 'authoritative');
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).exitCode).toBe(3);
    }
  });
});
