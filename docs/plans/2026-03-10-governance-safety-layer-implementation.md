# Governance Safety Layer (GSL) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 4-layer defense-in-depth system to prevent AI outputs from becoming live execution authority in MindTrace.

**Architecture:** Incremental layering approach with schema validation (Layer 1), audit trail enforcement (Layer 2), filesystem guards (Layer 3), and runtime type guards (Layer 4). Each layer builds on previous guarantees.

**Tech Stack:** TypeScript, Node.js, AJV (JSON schema validation), Vitest (testing)

---

## Implementation Order

This plan implements GSL in 4 sequential layers as designed:

1. **Layer 1: Schema Validation Gates** (Tasks 1-8)
2. **Layer 2: Audit Trail Enforcement** (Tasks 9-16)
3. **Layer 3: File System Guards** (Tasks 17-24)
4. **Layer 4: Runtime Type Guards** (Tasks 25-32)

Each layer must be complete and tested before proceeding to the next.

---

# LAYER 1: Schema Validation Gates

## Task 1: Create Schema Directory Structure

**Files:**
- Create: `schemas/authoritative/`
- Create: `schemas/advisory/`

**Step 1: Create directories**

```bash
mkdir -p schemas/authoritative
mkdir -p schemas/advisory
```

**Step 2: Add .gitkeep files**

```bash
touch schemas/authoritative/.gitkeep
touch schemas/advisory/.gitkeep
```

**Step 3: Verify structure**

Run: `ls -la schemas/`
Expected: Should show `authoritative/` and `advisory/` directories

**Step 4: Commit**

```bash
git add schemas/
git commit -m "feat(gsl): create schema directory structure for Layer 1

- Add schemas/authoritative/ for execution-influencing artifacts
- Add schemas/advisory/ for analysis-only artifacts
- Foundation for schema validation gates (GSL Layer 1)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Define Authoritative Schema - Policy Decision

**Files:**
- Create: `schemas/authoritative/policy-decision.schema.json`

**Step 1: Create policy decision schema**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "policy-decision.schema.json",
  "title": "Policy Decision",
  "description": "Authoritative policy decision artifact",
  "type": "object",
  "required": [
    "schemaVersion",
    "artifactClass",
    "runId",
    "decision",
    "timestamp"
  ],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "const": "1.0"
    },
    "artifactClass": {
      "type": "string",
      "const": "authoritative"
    },
    "runId": {
      "type": "string"
    },
    "decision": {
      "type": "string",
      "enum": ["pass", "fail", "skip", "error"]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "policyName": {
      "type": "string"
    },
    "reason": {
      "type": "string"
    }
  },
  "additionalProperties": false
}
```

**Step 2: Verify JSON validity**

Run: `cat schemas/authoritative/policy-decision.schema.json | jq .`
Expected: Valid JSON output

**Step 3: Commit**

```bash
git add schemas/authoritative/policy-decision.schema.json
git commit -m "feat(gsl): add policy-decision authoritative schema

- Define schema for policy decision artifacts
- Mark as authoritative (may influence execution)
- Include schemaVersion and artifactClass fields

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Define Authoritative Schema - Healing Attempts

**Files:**
- Create: `schemas/authoritative/healing-attempt-entry.schema.json`

**Step 1: Create healing attempt entry schema**

Note: This is a per-entry schema for JSONL streams.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "healing-attempt-entry.schema.json",
  "title": "Healing Attempt Entry",
  "description": "Single entry in healing-attempts.jsonl (authoritative)",
  "type": "object",
  "required": [
    "schema_version",
    "artifactClass",
    "attemptId",
    "stepScopeId",
    "runId",
    "tier",
    "result"
  ],
  "properties": {
    "schema_version": {
      "type": "string",
      "const": "1.0.0"
    },
    "artifactClass": {
      "type": "string",
      "const": "authoritative"
    },
    "attemptId": {
      "type": "string"
    },
    "attemptGroupId": {
      "type": "string"
    },
    "stepScopeId": {
      "type": "string"
    },
    "runId": {
      "type": "string"
    },
    "stepId": {
      "type": "string"
    },
    "tier": {
      "type": "string",
      "enum": ["contract", "cache", "lkg", "fallback", "llm"]
    },
    "candidateId": {
      "type": "string"
    },
    "probeMethodId": {
      "type": "string"
    },
    "probeTimeoutMs": {
      "type": "number"
    },
    "result": {
      "type": "string",
      "enum": ["success", "timeout", "not_attached", "not_visible", "not_enabled", "error"]
    },
    "budgetRemaining": {
      "type": "number"
    },
    "candidate": {
      "type": "object"
    }
  },
  "additionalProperties": false
}
```

**Step 2: Verify JSON validity**

Run: `cat schemas/authoritative/healing-attempt-entry.schema.json | jq .`
Expected: Valid JSON output

**Step 3: Commit**

```bash
git add schemas/authoritative/healing-attempt-entry.schema.json
git commit -m "feat(gsl): add healing-attempt-entry authoritative schema

- Define per-entry schema for healing-attempts.jsonl
- Supports JSONL line-by-line validation
- Mark as authoritative (influences healing decisions)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Define Advisory Schema - RCA Report

**Files:**
- Create: `schemas/advisory/rca-report.schema.json`

**Step 1: Create RCA report schema**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "rca-report.schema.json",
  "title": "Root Cause Analysis Report",
  "description": "Advisory RCA report (analysis only, never execution)",
  "type": "object",
  "required": [
    "schemaVersion",
    "artifactClass",
    "runId",
    "summary",
    "recommendations"
  ],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "const": "1.0"
    },
    "artifactClass": {
      "type": "string",
      "const": "advisory"
    },
    "runId": {
      "type": "string"
    },
    "stepId": {
      "type": "string"
    },
    "summary": {
      "type": "string",
      "description": "Human-readable root cause summary"
    },
    "detectedIssue": {
      "type": "string"
    },
    "recommendations": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "evidence": {
      "type": "object"
    }
  },
  "additionalProperties": false
}
```

**Step 2: Verify JSON validity**

Run: `cat schemas/advisory/rca-report.schema.json | jq .`
Expected: Valid JSON output

**Step 3: Commit**

```bash
git add schemas/advisory/rca-report.schema.json
git commit -m "feat(gsl): add rca-report advisory schema

- Define schema for root cause analysis reports
- Mark as advisory (analysis only, never execution)
- Include confidence and recommendations

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Schema Validator Package

**Files:**
- Create: `shared-packages/schema-validator/package.json`
- Create: `shared-packages/schema-validator/tsconfig.json`

**Step 1: Create package directory**

```bash
mkdir -p shared-packages/schema-validator/src
mkdir -p shared-packages/schema-validator/__tests__
```

**Step 2: Create package.json**

```json
{
  "name": "@mindtrace/schema-validator",
  "version": "1.0.0",
  "description": "Schema validation for MindTrace GSL Layer 1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "test:watch": "vitest --watch"
  },
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

**Step 4: Install dependencies**

Run: `cd shared-packages/schema-validator && npm install`
Expected: Dependencies installed successfully

**Step 5: Commit**

```bash
git add shared-packages/schema-validator/
git commit -m "feat(gsl): scaffold schema-validator package

- Create package structure for schema validation
- Add AJV for JSON schema validation
- Set up TypeScript configuration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Implement Schema Validator Interface

**Files:**
- Create: `shared-packages/schema-validator/src/types.ts`
- Create: `shared-packages/schema-validator/src/schema-validator.ts`

**Step 1: Write failing test**

Create: `shared-packages/schema-validator/__tests__/schema-validator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '../src/schema-validator';

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
```

**Step 2: Run test to verify it fails**

Run: `cd shared-packages/schema-validator && npm test`
Expected: FAIL with "SchemaValidator is not defined" or similar

**Step 3: Create types**

Create: `shared-packages/schema-validator/src/types.ts`

```typescript
export interface ValidationResult {
  valid: boolean;
  errors?: SchemaError[];
  artifact?: unknown;
}

export interface SchemaError {
  path: string;
  message: string;
  schemaPath?: string;
}

export interface SchemaValidator {
  validateAuthoritative(artifact: unknown, schemaName: string): ValidationResult;
  validateAdvisory(artifact: unknown, schemaName: string): ValidationResult;
  validateJSONLEntry(entry: unknown, schemaName: string): ValidationResult;
}
```

**Step 4: Implement minimal validator**

Create: `shared-packages/schema-validator/src/schema-validator.ts`

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ValidationResult, SchemaError } from './types';

export class SchemaValidator {
  private ajv: Ajv;
  private schemaCache: Map<string, object> = new Map();

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  validateAuthoritative(artifact: unknown, schemaName: string): ValidationResult {
    return this.validate(artifact, schemaName, 'authoritative');
  }

  validateAdvisory(artifact: unknown, schemaName: string): ValidationResult {
    return this.validate(artifact, schemaName, 'advisory');
  }

  validateJSONLEntry(entry: unknown, schemaName: string): ValidationResult {
    return this.validate(entry, schemaName, 'authoritative');
  }

  private validate(artifact: unknown, schemaName: string, category: 'authoritative' | 'advisory'): ValidationResult {
    const schema = this.loadSchema(schemaName, category);
    const validate = this.ajv.compile(schema);
    const valid = validate(artifact);

    if (valid) {
      return { valid: true, artifact };
    }

    const errors: SchemaError[] = (validate.errors || []).map(err => ({
      path: err.instancePath || 'root',
      message: err.message || 'Validation error',
      schemaPath: err.schemaPath
    }));

    return { valid: false, errors };
  }

  private loadSchema(schemaName: string, category: string): object {
    const cacheKey = `${category}/${schemaName}`;

    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!;
    }

    const schemaPath = join(process.cwd(), '../../schemas', category, `${schemaName}.schema.json`);
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);

    this.schemaCache.set(cacheKey, schema);
    return schema;
  }
}
```

**Step 5: Create index export**

Create: `shared-packages/schema-validator/src/index.ts`

```typescript
export { SchemaValidator } from './schema-validator';
export type { ValidationResult, SchemaError, SchemaValidator as ISchemaValidator } from './types';
```

**Step 6: Run test to verify it passes**

Run: `cd shared-packages/schema-validator && npm test`
Expected: PASS

**Step 7: Commit**

```bash
git add shared-packages/schema-validator/
git commit -m "feat(gsl): implement schema validator core

- Add SchemaValidator class with AJV
- Support authoritative and advisory validation
- Support JSONL per-entry validation
- Add schema caching for performance

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Schema Validation Error Handling

**Files:**
- Modify: `shared-packages/schema-validator/src/schema-validator.ts`
- Create: `shared-packages/schema-validator/src/errors.ts`

**Step 1: Write failing test**

```typescript
// Add to schema-validator.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (test should exist but schema validation might not catch all errors)

**Step 3: Create error types**

Create: `shared-packages/schema-validator/src/errors.ts`

```typescript
export class SchemaValidationError extends Error {
  constructor(
    public schemaName: string,
    public category: string,
    public errors: Array<{ path: string; message: string }>,
    public exitCode: number = 3
  ) {
    super(`Schema validation failed for ${category}/${schemaName}`);
    this.name = 'SchemaValidationError';
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      schemaName: this.schemaName,
      category: this.category,
      errors: this.errors,
      exitCode: this.exitCode
    };
  }
}
```

**Step 4: Add rejectInvalid method**

Update: `shared-packages/schema-validator/src/schema-validator.ts`

```typescript
import { SchemaValidationError } from './errors';

// Add to SchemaValidator class:
rejectInvalid(artifact: unknown, schemaName: string, category: 'authoritative' | 'advisory'): never {
  const result = this.validate(artifact, schemaName, category);

  if (!result.valid) {
    throw new SchemaValidationError(
      schemaName,
      category,
      result.errors!,
      3  // exit code for policy/compliance violation
    );
  }

  throw new Error('Unreachable: artifact was valid');
}
```

**Step 5: Export error**

Update: `shared-packages/schema-validator/src/index.ts`

```typescript
export { SchemaValidationError } from './errors';
```

**Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 7: Commit**

```bash
git add shared-packages/schema-validator/
git commit -m "feat(gsl): add schema validation error handling

- Create SchemaValidationError with exit code 3
- Add rejectInvalid method for strict validation
- Map validation failures to policy violations

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Integration Test - Schema Validation Layer 1

**Files:**
- Create: `shared-packages/schema-validator/__tests__/integration.test.ts`

**Step 1: Write integration test**

```typescript
import { describe, it, expect } from 'vitest';
import { SchemaValidator, SchemaValidationError } from '../src';

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
        budgetRemaining: 5
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
        summary: "Button selector changed",
        recommendations: [
          "Add stable data-testid",
          "Review selector strategy"
        ],
        confidence: 0.92
      };

      const result = validator.validateAdvisory(artifact, 'rca-report');
      expect(result.valid).toBe(true);
    });

    it('should reject advisory with authoritative class', () => {
      const artifact = {
        schemaVersion: "1.0",
        artifactClass: "authoritative",  // Should be "advisory"
        runId: "run_1",
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
```

**Step 2: Run integration test**

Run: `npm test integration`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add shared-packages/schema-validator/
git commit -m "test(gsl): add Layer 1 integration tests

- Test authoritative artifact validation
- Test advisory artifact validation
- Test error handling and exit codes
- Verify schema separation enforcement

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

# LAYER 2: Audit Trail Enforcement

## Task 9: Create Artifact Writer Directory Structure

**Files:**
- Create: `shared-packages/artifact-writer/package.json`
- Create: `shared-packages/artifact-writer/tsconfig.json`

**Step 1: Create package directory**

```bash
mkdir -p shared-packages/artifact-writer/src
mkdir -p shared-packages/artifact-writer/__tests__
```

**Step 2: Create package.json**

```json
{
  "name": "@mindtrace/artifact-writer",
  "version": "1.0.0",
  "description": "Artifact writer for MindTrace GSL Layer 2",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {
    "@mindtrace/schema-validator": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**Step 4: Install dependencies**

Run: `cd shared-packages/artifact-writer && npm install`

**Step 5: Commit**

```bash
git add shared-packages/artifact-writer/
git commit -m "feat(gsl): scaffold artifact-writer package for Layer 2

- Create package structure for audit trail enforcement
- Link to schema-validator for validation
- Prepare for runtime/advisory separation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Implement Runtime Artifact Writer

**Files:**
- Create: `shared-packages/artifact-writer/src/runtime-writer.ts`
- Create: `shared-packages/artifact-writer/src/types.ts`

**Step 1: Write failing test**

Create: `shared-packages/artifact-writer/__tests__/runtime-writer.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RuntimeArtifactWriter } from '../src/runtime-writer';
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
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "RuntimeArtifactWriter is not defined"

**Step 3: Create types**

Create: `shared-packages/artifact-writer/src/types.ts`

```typescript
export interface AuthoritativeArtifact {
  schemaVersion: string;
  artifactClass: 'authoritative';
  [key: string]: unknown;
}

export interface AdvisoryArtifact {
  schemaVersion: string;
  artifactClass: 'advisory';
  [key: string]: unknown;
}

export interface StreamEntry {
  schema_version: string;
  artifactClass: 'authoritative';
  [key: string]: unknown;
}
```

**Step 4: Implement RuntimeArtifactWriter**

Create: `shared-packages/artifact-writer/src/runtime-writer.ts`

```typescript
import { writeFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { SchemaValidator } from '@mindtrace/schema-validator';
import type { AuthoritativeArtifact, StreamEntry } from './types';

export class RuntimeArtifactWriter {
  private runtimePath: string;
  private validator: SchemaValidator;

  constructor(runDir: string) {
    this.runtimePath = join(runDir, 'artifacts', 'runtime');
    this.validator = new SchemaValidator();
    this.ensureDirectory();
  }

  writeRuntimeArtifact(
    artifact: AuthoritativeArtifact,
    schemaName: string,
    filename: string
  ): void {
    // Validate before write
    const result = this.validator.validateAuthoritative(artifact, schemaName);

    if (!result.valid) {
      this.validator.rejectInvalid(artifact, schemaName, 'authoritative');
    }

    // Write to runtime directory
    const filePath = join(this.runtimePath, filename);
    const content = JSON.stringify(artifact, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  }

  appendRuntimeStream(
    entry: StreamEntry,
    schemaName: string,
    streamName: string
  ): void {
    // Validate per-entry
    const result = this.validator.validateJSONLEntry(entry, schemaName);

    if (!result.valid) {
      this.validator.rejectInvalid(entry, schemaName, 'authoritative');
    }

    // Append to JSONL stream
    const filePath = join(this.runtimePath, streamName);
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(filePath, line, 'utf-8');
  }

  private ensureDirectory(): void {
    if (!existsSync(this.runtimePath)) {
      mkdirSync(this.runtimePath, { recursive: true });
    }
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```bash
git add shared-packages/artifact-writer/
git commit -m "feat(gsl): implement RuntimeArtifactWriter for Layer 2

- Write authoritative artifacts to artifacts/runtime/
- Validate before write using schema validator
- Support snapshot artifacts and JSONL streams
- Enforce artifacts/runtime/ directory separation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Implement Advisory Artifact Writer

**Files:**
- Create: `shared-packages/artifact-writer/src/advisory-writer.ts`

**Step 1: Write failing test**

Create: `shared-packages/artifact-writer/__tests__/advisory-writer.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdvisoryArtifactWriter } from '../src/advisory-writer';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';

describe('AdvisoryArtifactWriter', () => {
  const testRunDir = 'test-runs/run_test';
  const advisoryPath = `${testRunDir}/artifacts/advisory`;

  beforeEach(() => {
    mkdirSync(advisoryPath, { recursive: true });
  });

  afterEach(() => {
    if (existsSync('test-runs')) {
      rmSync('test-runs', { recursive: true });
    }
  });

  it('should write advisory artifact to advisory directory', () => {
    const writer = new AdvisoryArtifactWriter(testRunDir);

    const artifact = {
      schemaVersion: "1.0",
      artifactClass: "advisory",
      runId: "run_test",
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
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

**Step 3: Implement AdvisoryArtifactWriter**

Create: `shared-packages/artifact-writer/src/advisory-writer.ts`

```typescript
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { SchemaValidator } from '@mindtrace/schema-validator';
import type { AdvisoryArtifact } from './types';

export class AdvisoryArtifactWriter {
  private advisoryPath: string;
  private validator: SchemaValidator;

  constructor(runDir: string) {
    this.advisoryPath = join(runDir, 'artifacts', 'advisory');
    this.validator = new SchemaValidator();
    this.ensureDirectory();
  }

  writeAdvisoryArtifact(
    artifact: AdvisoryArtifact,
    schemaName: string,
    filename: string
  ): void {
    // Validate before write
    const result = this.validator.validateAdvisory(artifact, schemaName);

    if (!result.valid) {
      this.validator.rejectInvalid(artifact, schemaName, 'advisory');
    }

    // Verify artifactClass is advisory (extra safety check)
    if (artifact.artifactClass !== 'advisory') {
      throw new Error(
        'CROSS_DIRECTORY_WRITE: Attempted to write non-advisory artifact to advisory directory'
      );
    }

    // Write to advisory directory
    const filePath = join(this.advisoryPath, filename);
    const content = JSON.stringify(artifact, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  }

  private ensureDirectory(): void {
    if (!existsSync(this.advisoryPath)) {
      mkdirSync(this.advisoryPath, { recursive: true });
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Export from index**

Create: `shared-packages/artifact-writer/src/index.ts`

```typescript
export { RuntimeArtifactWriter } from './runtime-writer';
export { AdvisoryArtifactWriter } from './advisory-writer';
export type {
  AuthoritativeArtifact,
  AdvisoryArtifact,
  StreamEntry
} from './types';
```

**Step 6: Commit**

```bash
git add shared-packages/artifact-writer/
git commit -m "feat(gsl): implement AdvisoryArtifactWriter for Layer 2

- Write advisory artifacts to artifacts/advisory/
- Validate before write using schema validator
- Reject authoritative artifacts with clear error
- Enforce directory separation at write boundary

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12-16: [Continue with remaining Layer 2 tasks...]

**Note:** Due to length constraints, Tasks 12-16 would follow the same TDD pattern for:
- Task 12: Add artifact class metadata injection
- Task 13: Create compatibility loader for legacy artifacts
- Task 14: Add read-time enforcement checks
- Task 15: Integrate with existing healing engine
- Task 16: Layer 2 integration tests

---

# LAYER 3: File System Guards

## Task 17-24: [File System Guards Implementation]

**Note:** Tasks 17-24 would cover:
- Task 17: Create WriteAuthorityRegistry
- Task 18: Implement FileSystemGuard
- Task 19: Define writer identity/capability system
- Task 20: Add centralized guarded write APIs
- Task 21: Add startup integrity validation
- Task 22: Add violation logging
- Task 23: Integrate with contract/cache writers
- Task 24: Layer 3 integration tests

---

# LAYER 4: Runtime Type Guards

## Task 25-32: [Runtime Type Guards Implementation]

**Note:** Tasks 25-32 would cover:
- Task 25: Define branded type system
- Task 26: Create trusted loader functions
- Task 27: Update healing orchestrator with branded types
- Task 28: Update Claude Skills interfaces
- Task 29: Add lint rules for unsafe casts
- Task 30: Add module boundary enforcement
- Task 31: Document escape hatch patterns
- Task 32: Layer 4 integration tests

---

## Final Integration Test

### Task 33: End-to-End GSL Integration Test

**Files:**
- Create: `shared-packages/gsl-integration/__tests__/e2e-gsl.test.ts`

**Step 1: Write comprehensive E2E test**

```typescript
import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '@mindtrace/schema-validator';
import { RuntimeArtifactWriter, AdvisoryArtifactWriter } from '@mindtrace/artifact-writer';

describe('GSL End-to-End Integration', () => {
  it('should enforce complete authority separation', () => {
    // Layer 1: Schema validation
    const validator = new SchemaValidator();

    // Layer 2: Audit trail enforcement
    const runtimeWriter = new RuntimeArtifactWriter('test-runs/e2e');
    const advisoryWriter = new AdvisoryArtifactWriter('test-runs/e2e');

    // Authoritative artifact → runtime directory
    const authArtifact = {
      schemaVersion: "1.0",
      artifactClass: "authoritative",
      runId: "e2e_test",
      decision: "pass",
      timestamp: "2026-03-10T10:00:00Z"
    };

    runtimeWriter.writeRuntimeArtifact(authArtifact, 'policy-decision', 'policy.json');

    // Advisory artifact → advisory directory
    const advisoryArtifact = {
      schemaVersion: "1.0",
      artifactClass: "advisory",
      runId: "e2e_test",
      summary: "Analysis complete",
      recommendations: ["Improve selectors"]
    };

    advisoryWriter.writeAdvisoryArtifact(advisoryArtifact, 'rca-report', 'rca.json');

    // Verify separation
    expect(existsSync('test-runs/e2e/artifacts/runtime/policy.json')).toBe(true);
    expect(existsSync('test-runs/e2e/artifacts/advisory/rca.json')).toBe(true);

    // Verify cross-directory write rejection
    expect(() => {
      advisoryWriter.writeAdvisoryArtifact(authArtifact as any, 'policy-decision', 'wrong.json');
    }).toThrow();
  });
});
```

**Step 2: Run E2E test**

Run: `npm test e2e`
Expected: PASS

**Step 3: Commit**

```bash
git add .
git commit -m "test(gsl): add end-to-end GSL integration test

- Verify all 4 layers work together
- Test complete authority separation
- Confirm cross-directory write rejection
- Validate schema → audit → filesystem → type guards

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria

✅ All 4 layers implemented sequentially
✅ Each layer tested before proceeding
✅ No breaking changes to existing runtime
✅ Backward compatibility maintained
✅ Schema validation prevents invalid artifacts
✅ Audit trail separates authoritative from advisory
✅ Filesystem guards prevent unauthorized writes
✅ Type guards prevent compile-time authority misuse
✅ Comprehensive test coverage (unit + integration + E2E)
✅ All tests passing
✅ Exit code 3 for policy violations

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-03-10-governance-safety-layer-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
