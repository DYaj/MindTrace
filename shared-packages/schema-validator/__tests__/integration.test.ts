import { describe, it, expect } from 'vitest';
import { SchemaValidator, SchemaValidationError } from '../src/index.js';

describe('Schema Validation Integration', () => {
  const validator = new SchemaValidator();

  describe('Authoritative Artifacts', () => {
    it('should validate policy-decision artifact', () => {
      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "authoritative",
        runId: "run_test",
        decision: "pass",
        timestamp: "2026-03-10T10:00:00Z",
        policyName: "test-policy",
        reason: "All checks passed"
      };

      const result = validator.validateAuthoritative(artifact, 'policy-decision');
      expect(result.valid).toBe(true);
    });

    it('should validate healing-attempt entry', () => {
      const entry = {
        schema_version: "1.0.0",
        artifactClass: "authoritative",
        attemptId: "attempt_1",
        stepScopeId: "scope_1",
        runId: "run_1",
        tier: "contract",
        result: "success",
        candidateId: "cand_1",
        budgetRemaining: { step: 5, run: 10 }
      };

      const result = validator.validateJSONLEntry(entry, 'healing-attempt-entry');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid artifactClass', () => {
      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "INVALID",  // Wrong class
        runId: "run_1",
        decision: "pass",
        timestamp: "2026-03-10T10:00:00Z"
      };

      const result = validator.validateAuthoritative(artifact, 'policy-decision');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Advisory Artifacts', () => {
    it('should validate RCA report', () => {
      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "advisory",
        runId: "run_1",
        category: "selector_failed",
        confidence: 0.92,
        isFlaky: false,
        summary: "Button selector changed",
        recommendations: [
          "Add stable data-testid",
          "Review selector strategy"
        ]
      };

      const result = validator.validateAdvisory(artifact, 'rca-report');
      expect(result.valid).toBe(true);
    });

    it('should reject advisory with authoritative class', () => {
      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "authoritative",  // Should be "advisory"
        runId: "run_1",
        category: "selector_failed",
        confidence: 0.5,
        isFlaky: false,
        summary: "Test summary",
        recommendations: []
      };

      const result = validator.validateAdvisory(artifact, 'rca-report');
      expect(result.valid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw SchemaValidationError on rejectInvalid', () => {
      const invalidArtifact = { invalid: true };

      expect(() => {
        validator.rejectInvalid(invalidArtifact, 'policy-decision', 'authoritative');
      }).toThrow(SchemaValidationError);
    });

    it('should include exit code 3 in error', () => {
      const invalidArtifact = { invalid: true };

      try {
        validator.rejectInvalid(invalidArtifact, 'policy-decision', 'authoritative');
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError);
        expect((error as SchemaValidationError).exitCode).toBe(3);
      }
    });
  });
});
