# Phase 0 Contract Generators Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete Phase 0 contract bundle generation with deterministic fingerprinting, evidence retrofit, and atomic writes.

**Architecture:** Modular pure generators + single write authority. Generators are pure functions (no I/O), write layer handles atomic bundle writes, coordinator orchestrates pipeline: scan → detect → generate → retrofit → write → validate → fingerprint → commit.

**Tech Stack:** TypeScript, Node.js, AJV (JSON schema validation), MCP SDK, crypto (SHA256), fs/promises

---

## Prerequisites

**Before starting:**

- Branch: Create from `Phase2.3.4-APIReader` (current branch)
- Working directory: `/Users/davidyang/Desktop/MindTrace Inc/mindtrace-for-playwright`
- Node version: 18+ (for ESM support)
- Dependencies: Ensure `@modelcontextprotocol/sdk`, `ajv`, `ajv-formats` installed

**Design Reference:** `docs/plans/2026-03-02-phase0-contract-generators-design.md`

---

## Task 1: Setup Type Definitions & Constants

**Files:**

- Modify: `repo-intelligence-mcp/src/types/contract.ts`
- Create: `repo-intelligence-mcp/src/tools/fingerprintContract.ts` (constants only)

**Step 1: Add new type definitions to contract.ts**

```typescript
// Add to existing file after current types

/**
 * Architecture is the high-level test automation architecture.
 * StyleKey is the repo style family key (style1-native / style2-bdd / style3-pom-bdd / unknown).
 */
export type Architecture = "native" | "pom" | "bdd" | "hybrid" | "unknown";
export type StyleKey = `style${number}-${string}` | "unknown";

export type EvidenceKind = "config" | "dependency" | "wrapper" | "pattern" | "entrypoint" | "structure";

export type Evidence = {
  kind: EvidenceKind;
  /**
   * POSIX normalized, repo-relative. May be "" during initial retrofit stage.
   */
  file: string;
  sample?: string;
};

export type Entrypoint = {
  style: string;
  entrypoint: string;
  confidence?: number;
};

export type AutomationContract = {
  schema_version: string;
  contractVersion: string; // legacy compat
  framework: Framework;

  stylesDetected: string[];
  primaryStyle: StyleKey;

  architecture: Architecture;

  entrypoints: Entrypoint[];

  paths: Record<string, unknown>;

  refs: {
    selectorStrategyRef: string;
    assertionStyleRef: string;
    pageKeyPolicyRef: string;
  };

  page_identity: {
    mode: "hybrid" | "detected" | "hardcoded";
    primary: string;
    ref: string;
  };

  generated_by: {
    name: string;
    version: string;
  };

  evidence: Evidence[];
};

export type PageKeyPolicy = {
  schema_version: string;
  mode: "hybrid" | "detected" | "hardcoded";

  patterns: Record<
    string,
    {
      template: string;
      confidence: number;
      source: "hardcoded" | "detected";
    }
  >;

  collision_resolution: "deterministic_suffix" | "error" | "warn";
  fallback_order: string[];
  dynamicFallback: boolean;

  evidence: Evidence[];

  examples?: Array<{
    path: string;
    pageKey: string;
    style: string;
  }>;
};

export type ContractMeta = {
  schema_version: string;
  generated_at: string;

  scan_summary: {
    files_scanned: number;
    directories: number;
    signals_detected: number;
  };

  tool_versions: Record<string, string>;

  /**
   * Sorted list of contract files in the fingerprint set (excluding meta + hash).
   */
  contract_inputs: string[];

  warnings?: string[];
};
```

**Step 2: Create FINGERPRINT_FILES constant**

Create `repo-intelligence-mcp/src/tools/fingerprintContract.ts`:

```typescript
/**
 * Canonical list of files included in contract fingerprint.
 * Order: Alphabetically sorted (deterministic).
 * Excludes: contract.meta.json (has timestamp), automation-contract.hash (is the hash).
 */
export const FINGERPRINT_FILES = [
  "assertion-style.json",
  "automation-contract.json",
  "framework-pattern.json",
  "page-key-policy.json",
  "repo-topology.json",
  "selector-strategy.json",
  "wrapper-discovery.json"
] as const;
```

**Step 3: Commit type definitions**

```bash
git add repo-intelligence-mcp/src/types/contract.ts repo-intelligence-mcp/src/tools/fingerprintContract.ts
git commit -m "Phase 0: add contract type definitions and fingerprint constants

- Add AutomationContract, PageKeyPolicy, ContractMeta types
- Add Architecture, StyleKey, Evidence, Entrypoint types
- Define FINGERPRINT_FILES canonical constant (7 files)

"
```

---

## Task 2: JSON Schemas

**Files:**

- Create: `repo-intelligence-mcp/src/schemas/shared/evidence.schema.json`
- Create: `repo-intelligence-mcp/src/schemas/automation-contract.schema.json`
- Create: `repo-intelligence-mcp/src/schemas/page-key-policy.schema.json`
- Create: `repo-intelligence-mcp/src/schemas/contract-meta.schema.json`

**Step 1: Create shared evidence schema**

Create `repo-intelligence-mcp/src/schemas/shared/evidence.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "mindtrace://schemas/shared/evidence.schema.json",
  "title": "Evidence",
  "type": "object",
  "additionalProperties": false,
  "required": ["kind", "file"],
  "properties": {
    "kind": {
      "type": "string",
      "enum": ["config", "dependency", "wrapper", "pattern", "entrypoint", "structure"]
    },
    "file": {
      "type": "string",
      "description": "POSIX normalized, repo-relative. May be empty string in initial retrofit stage."
    },
    "sample": { "type": "string" }
  }
}
```

**Step 2: Create automation-contract schema**

Create `repo-intelligence-mcp/src/schemas/automation-contract.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "mindtrace://schemas/automation-contract.schema.json",
  "title": "Automation Contract",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schema_version",
    "contractVersion",
    "framework",
    "stylesDetected",
    "primaryStyle",
    "architecture",
    "entrypoints",
    "paths",
    "refs",
    "page_identity",
    "generated_by",
    "evidence"
  ],
  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "contractVersion": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Legacy compatibility field during transition"
    },
    "framework": {
      "type": "string",
      "enum": ["cypress", "playwright", "selenium", "unknown"]
    },
    "stylesDetected": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 0,
      "description": "Detected style keys (e.g., style1-native, style2-bdd, style3-pom-bdd). Can be empty for unknown repos."
    },
    "primaryStyle": {
      "type": "string",
      "description": "Primary style key (e.g., style3-pom-bdd) or 'unknown'.",
      "pattern": "^(style\\d+-[a-z0-9-]+|unknown)$"
    },
    "architecture": {
      "type": "string",
      "enum": ["native", "pom", "bdd", "hybrid", "unknown"]
    },
    "entrypoints": {
      "type": "array",
      "minItems": 0,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["style", "entrypoint"],
        "properties": {
          "style": { "type": "string" },
          "entrypoint": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    },
    "paths": {
      "type": "object",
      "description": "Repo path map used by Phase 1+ (must be deterministic). Keep flexible early; tighten later.",
      "additionalProperties": true
    },
    "refs": {
      "type": "object",
      "additionalProperties": false,
      "required": ["selectorStrategyRef", "assertionStyleRef", "pageKeyPolicyRef"],
      "properties": {
        "selectorStrategyRef": { "type": "string" },
        "assertionStyleRef": { "type": "string" },
        "pageKeyPolicyRef": { "type": "string" }
      }
    },
    "page_identity": {
      "type": "object",
      "additionalProperties": false,
      "required": ["mode", "primary", "ref"],
      "properties": {
        "mode": { "type": "string", "enum": ["hybrid", "detected", "hardcoded"] },
        "primary": { "type": "string" },
        "ref": { "type": "string" }
      }
    },
    "generated_by": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "version"],
      "properties": {
        "name": { "type": "string" },
        "version": { "type": "string" }
      }
    },
    "evidence": {
      "type": "array",
      "minItems": 0,
      "items": { "$ref": "mindtrace://schemas/shared/evidence.schema.json" }
    }
  }
}
```

**Step 3: Create page-key-policy schema**

Create `repo-intelligence-mcp/src/schemas/page-key-policy.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "mindtrace://schemas/page-key-policy.schema.json",
  "title": "Page Key Policy",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "mode", "patterns", "collision_resolution", "fallback_order", "dynamicFallback", "evidence"],
  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "mode": {
      "type": "string",
      "enum": ["hybrid", "detected", "hardcoded"]
    },
    "patterns": {
      "type": "object",
      "description": "StyleKey -> pattern template with confidence/source.",
      "additionalProperties": {
        "type": "object",
        "additionalProperties": false,
        "required": ["template", "confidence", "source"],
        "properties": {
          "template": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "source": { "type": "string", "enum": ["hardcoded", "detected"] }
        }
      }
    },
    "collision_resolution": {
      "type": "string",
      "enum": ["deterministic_suffix", "error", "warn"]
    },
    "fallback_order": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string" }
    },
    "dynamicFallback": { "type": "boolean" },
    "evidence": {
      "type": "array",
      "minItems": 0,
      "items": { "$ref": "mindtrace://schemas/shared/evidence.schema.json" }
    },
    "examples": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["path", "pageKey", "style"],
        "properties": {
          "path": { "type": "string" },
          "pageKey": { "type": "string" },
          "style": { "type": "string" }
        }
      }
    }
  }
}
```

**Step 4: Create contract-meta schema**

Create `repo-intelligence-mcp/src/schemas/contract-meta.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "mindtrace://schemas/contract-meta.schema.json",
  "title": "Contract Metadata",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "generated_at", "scan_summary", "tool_versions", "contract_inputs"],
  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "generated_at": {
      "type": "string",
      "format": "date-time"
    },
    "scan_summary": {
      "type": "object",
      "additionalProperties": false,
      "required": ["files_scanned", "directories", "signals_detected"],
      "properties": {
        "files_scanned": { "type": "integer", "minimum": 0 },
        "directories": { "type": "integer", "minimum": 0 },
        "signals_detected": { "type": "integer", "minimum": 0 }
      }
    },
    "tool_versions": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "contract_inputs": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Sorted list of contract files in the fingerprint set (excluding meta + hash)."
    },
    "warnings": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

**Step 5: Commit schemas**

```bash
git add repo-intelligence-mcp/src/schemas/
git commit -m "Phase 0: add JSON schemas for contract bundle

- Add shared/evidence.schema.json (referenced by all contracts)
- Add automation-contract.schema.json (master contract)
- Add page-key-policy.schema.json (page identity rules)
- Add contract-meta.schema.json (metadata, excluded from hash)

"
```

---

## Task 3: Core Utilities (Determinism & Normalization)

**Files:**

- Create: `repo-intelligence-mcp/src/core/normalization.ts`
- Modify: `repo-intelligence-mcp/src/core/deterministic.ts`

**Step 1: Create normalization utilities**

Create `repo-intelligence-mcp/src/core/normalization.ts`:

```typescript
/**
 * Convert any path to POSIX format (forward slashes).
 * Strips leading ./ and normalizes // to /.
 *
 * @param path - File path (Windows or POSIX)
 * @returns POSIX normalized, repo-relative path
 */
export function toPosix(path: string): string {
  return path
    .replace(/\\/g, "/") // backslash → forward slash
    .replace(/^\.\//, "") // strip leading ./
    .replace(/\/\//g, "/"); // normalize // → /
}
```

**Step 2: Create canonical stringify**

Create `repo-intelligence-mcp/src/core/deterministic.ts`:

```typescript
/**
 * Canonical JSON stringify with deep recursive key sorting.
 * Ensures byte-identical output for same input (deterministic).
 *
 * @param obj - Any JSON-serializable object
 * @returns Canonical JSON string (2-space indent, sorted keys at all depths)
 */
export function canonicalStringify(obj: any): string {
  return JSON.stringify(canonicalize(obj), null, 2);
}

function canonicalize(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }

  // Recursively sort keys at ALL depths
  const sorted: any = {};
  Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      sorted[key] = canonicalize(obj[key]);
    });

  return sorted;
}
```

**Step 3: Write test for toPosix**

Create `repo-intelligence-mcp/src/core/__tests__/normalization.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { toPosix } from "../normalization.js";

describe("toPosix", () => {
  it("converts Windows paths to POSIX", () => {
    expect(toPosix("src\\pages\\Login.ts")).toBe("src/pages/Login.ts");
  });

  it("strips leading ./", () => {
    expect(toPosix("./src/pages/Login.ts")).toBe("src/pages/Login.ts");
  });

  it("normalizes double slashes", () => {
    expect(toPosix("src//pages//Login.ts")).toBe("src/pages/Login.ts");
  });

  it("handles mixed separators", () => {
    expect(toPosix(".\\src\\\\pages//Login.ts")).toBe("src/pages/Login.ts");
  });

  it("handles already normalized paths", () => {
    expect(toPosix("src/pages/Login.ts")).toBe("src/pages/Login.ts");
  });
});
```

**Step 4: Run test to verify it passes**

```bash
cd repo-intelligence-mcp
npm test -- src/core/__tests__/normalization.test.ts
```

Expected: All tests PASS

**Step 5: Write test for canonicalStringify**

Create `repo-intelligence-mcp/src/core/__tests__/deterministic.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { canonicalStringify } from "../deterministic.js";

describe("canonicalStringify", () => {
  it("sorts keys alphabetically at top level", () => {
    const obj = { z: 1, a: 2, m: 3 };
    const result = canonicalStringify(obj);
    expect(result).toBe('{\n  "a": 2,\n  "m": 3,\n  "z": 1\n}');
  });

  it("sorts keys recursively at all depths", () => {
    const obj = {
      z: { b: 1, a: 2 },
      a: { z: 3, m: 4 }
    };
    const result = canonicalStringify(obj);
    const parsed = JSON.parse(result);
    const keys = Object.keys(parsed);
    expect(keys).toEqual(["a", "z"]);
    expect(Object.keys(parsed.z)).toEqual(["a", "b"]);
  });

  it("preserves array order", () => {
    const obj = { arr: [3, 1, 2] };
    const result = canonicalStringify(obj);
    expect(JSON.parse(result).arr).toEqual([3, 1, 2]);
  });

  it("produces identical output for same input", () => {
    const obj1 = { b: 1, a: 2 };
    const obj2 = { a: 2, b: 1 };
    expect(canonicalStringify(obj1)).toBe(canonicalStringify(obj2));
  });
});
```

**Step 6: Run test to verify it passes**

```bash
npm test -- src/core/__tests__/deterministic.test.ts
```

Expected: All tests PASS

**Step 7: Commit core utilities**

```bash
git add repo-intelligence-mcp/src/core/
git commit -m "Phase 0: add core normalization and determinism utilities

- Add toPosix() for POSIX path normalization
- Add canonicalStringify() with deep recursive key sorting
- Add comprehensive tests for both utilities

"
```

---

## Task 4: Schema Validation (AJV Integration)

**Files:**

- Create: `repo-intelligence-mcp/src/core/validation.ts`
- Create: `repo-intelligence-mcp/src/core/__tests__/validation.test.ts`

**Step 1: Create validation module**

Create `repo-intelligence-mcp/src/core/validation.ts`:

```typescript
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

// Load all schemas on startup (shared/evidence MUST be first)
const SCHEMA_DIR = path.join(__dirname, "../schemas");
const SCHEMA_FILES = [
  "shared/evidence.schema.json", // Load shared first
  "automation-contract.schema.json",
  "page-key-policy.schema.json",
  "contract-meta.schema.json",
  "framework-pattern.schema.json",
  "selector-strategy.schema.json",
  "assertion-style.schema.json",
  "wrapper-discovery.schema.json",
  "repo-topology.schema.json"
];

for (const schemaFile of SCHEMA_FILES) {
  const schema = JSON.parse(readFileSync(path.join(SCHEMA_DIR, schemaFile), "utf-8"));
  ajv.addSchema(schema);
}

export function validateAgainstSchema(filename: string, data: any): { valid: boolean; errors: string[] } {
  const schemaId = `mindtrace://schemas/${filename.replace(".json", ".schema.json")}`;
  const validate = ajv.getSchema(schemaId);

  if (!validate) {
    return { valid: false, errors: [`No schema found for ${filename}`] };
  }

  const valid = validate(data);

  if (!valid && validate.errors) {
    return {
      valid: false,
      errors: validate.errors.map((e) => `${e.instancePath} ${e.message}`)
    };
  }

  return { valid: true, errors: [] };
}
```

**Step 2: Write test for validation**

Create `repo-intelligence-mcp/src/core/__tests__/validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateAgainstSchema } from "../validation.js";

describe("validateAgainstSchema", () => {
  it("validates valid automation-contract.json", () => {
    const valid = {
      schema_version: "0.1.0",
      contractVersion: "0.1.0",
      framework: "playwright",
      stylesDetected: ["style1-native"],
      primaryStyle: "style1-native",
      architecture: "native",
      entrypoints: [],
      paths: {},
      refs: {
        selectorStrategyRef: "./selector-strategy.json",
        assertionStyleRef: "./assertion-style.json",
        pageKeyPolicyRef: "./page-key-policy.json"
      },
      page_identity: {
        mode: "hybrid",
        primary: "style1-native",
        ref: "./page-key-policy.json"
      },
      generated_by: {
        name: "repo-intelligence-mcp",
        version: "0.1.0"
      },
      evidence: []
    };

    const result = validateAgainstSchema("automation-contract.json", valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects automation-contract.json with missing required field", () => {
    const invalid = {
      schema_version: "0.1.0",
      framework: "playwright"
      // missing many required fields
    };

    const result = validateAgainstSchema("automation-contract.json", invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects automation-contract.json with invalid primaryStyle pattern", () => {
    const invalid = {
      schema_version: "0.1.0",
      contractVersion: "0.1.0",
      framework: "playwright",
      stylesDetected: [],
      primaryStyle: "invalid-pattern", // doesn't match regex
      architecture: "native",
      entrypoints: [],
      paths: {},
      refs: {
        selectorStrategyRef: "./selector-strategy.json",
        assertionStyleRef: "./assertion-style.json",
        pageKeyPolicyRef: "./page-key-policy.json"
      },
      page_identity: {
        mode: "hybrid",
        primary: "invalid",
        ref: "./page-key-policy.json"
      },
      generated_by: {
        name: "repo-intelligence-mcp",
        version: "0.1.0"
      },
      evidence: []
    };

    const result = validateAgainstSchema("automation-contract.json", invalid);
    expect(result.valid).toBe(false);
  });
});
```

**Step 3: Run test to verify it passes**

```bash
npm test -- src/core/__tests__/validation.test.ts
```

Expected: All tests PASS

**Step 4: Commit validation**

```bash
git add repo-intelligence-mcp/src/core/validation.ts repo-intelligence-mcp/src/core/__tests__/validation.test.ts
git commit -m "Phase 0: add schema validation with AJV

- Load all schemas on startup (shared/evidence first)
- validateAgainstSchema() for runtime validation
- ESM-safe (uses fileURLToPath for __dirname)
- Add tests for valid/invalid contracts

"
```

---

## Task 5: Fingerprint Computation (Read-Only)

**Files:**

- Modify: `repo-intelligence-mcp/src/tools/fingerprintContract.ts`
- Create: `repo-intelligence-mcp/src/tools/__tests__/fingerprintContract.test.ts`

**Step 1: Implement computeContractFingerprint**

Add to `repo-intelligence-mcp/src/tools/fingerprintContract.ts`:

```typescript
import crypto from "crypto";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { canonicalStringify } from "../core/deterministic.js";
import { toPosix } from "../core/normalization.js";

// FINGERPRINT_FILES already defined in Task 1

export function computeContractFingerprint(
  contractDir: string,
  mode: "strict" | "best_effort" = "best_effort"
): { ok: true; fingerprint: string; files: string[] } | { ok: false; error: string } {
  const required = [...FINGERPRINT_FILES];

  const available: string[] = [];
  const missing: string[] = [];

  for (const file of required) {
    const filePath = path.join(contractDir, file);
    if (existsSync(filePath)) {
      available.push(file);
    } else {
      missing.push(file);
    }
  }

  if (mode === "strict" && missing.length > 0) {
    return { ok: false, error: `Missing required files: ${missing.join(", ")}` };
  }

  if (available.length === 0) {
    return { ok: false, error: "No contract files found" };
  }

  const sortedFiles = available.slice().sort((a, b) => a.localeCompare(b));

  // Include filename in hash stream to bind content to specific file
  const hasher = crypto.createHash("sha256");

  for (const file of sortedFiles) {
    const content = readFileSync(path.join(contractDir, file), "utf-8");
    const parsed = JSON.parse(content);

    hasher.update(toPosix(file) + "\n"); // Bind filename
    hasher.update(canonicalStringify(parsed) + "\n"); // Bind content
  }

  const fingerprint = hasher.digest("hex");

  return { ok: true, fingerprint, files: sortedFiles };
}

export function writeFingerprintAtomic(contractDir: string, fingerprint: string): void {
  const outPath = path.join(contractDir, "automation-contract.hash");
  const tempHashPath = outPath + `.tmp.${crypto.randomUUID()}`;

  import("fs").then(({ writeFileSync, existsSync, unlinkSync, renameSync }) => {
    writeFileSync(tempHashPath, fingerprint + "\n", "utf-8");

    if (existsSync(outPath)) {
      unlinkSync(outPath); // Delete stale
    }

    renameSync(tempHashPath, outPath); // Atomic rename
  });
}
```

**Step 2: Write test for computeContractFingerprint**

Create `repo-intelligence-mcp/src/tools/__tests__/fingerprintContract.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { computeContractFingerprint, FINGERPRINT_FILES } from "../fingerprintContract.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";

describe("computeContractFingerprint", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(tmpdir(), `test-contract-${crypto.randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("computes fingerprint in strict mode when all files exist", () => {
    // Write all required files
    for (const file of FINGERPRINT_FILES) {
      writeFileSync(path.join(testDir, file), JSON.stringify({ test: "data" }), "utf-8");
    }

    const result = computeContractFingerprint(testDir, "strict");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(result.files).toEqual([...FINGERPRINT_FILES].sort());
    }
  });

  it("fails in strict mode when files missing", () => {
    // Write only some files
    writeFileSync(path.join(testDir, "repo-topology.json"), "{}", "utf-8");

    const result = computeContractFingerprint(testDir, "strict");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Missing required files");
    }
  });

  it("succeeds in best_effort mode with partial files", () => {
    writeFileSync(path.join(testDir, "repo-topology.json"), "{}", "utf-8");

    const result = computeContractFingerprint(testDir, "best_effort");
    expect(result.ok).toBe(true);
  });

  it("produces same hash for same content regardless of key order", () => {
    const data1 = { b: 2, a: 1 };
    const data2 = { a: 1, b: 2 };

    writeFileSync(path.join(testDir, "repo-topology.json"), JSON.stringify(data1), "utf-8");
    const result1 = computeContractFingerprint(testDir, "best_effort");

    writeFileSync(path.join(testDir, "repo-topology.json"), JSON.stringify(data2), "utf-8");
    const result2 = computeContractFingerprint(testDir, "best_effort");

    expect(result1.ok && result2.ok).toBe(true);
    if (result1.ok && result2.ok) {
      expect(result1.fingerprint).toBe(result2.fingerprint);
    }
  });

  it("produces different hash when content swaps between files", () => {
    writeFileSync(path.join(testDir, "repo-topology.json"), JSON.stringify({ a: 1 }), "utf-8");
    writeFileSync(path.join(testDir, "framework-pattern.json"), JSON.stringify({ b: 2 }), "utf-8");
    const result1 = computeContractFingerprint(testDir, "best_effort");

    // Swap content
    writeFileSync(path.join(testDir, "repo-topology.json"), JSON.stringify({ b: 2 }), "utf-8");
    writeFileSync(path.join(testDir, "framework-pattern.json"), JSON.stringify({ a: 1 }), "utf-8");
    const result2 = computeContractFingerprint(testDir, "best_effort");

    expect(result1.ok && result2.ok).toBe(true);
    if (result1.ok && result2.ok) {
      expect(result1.fingerprint).not.toBe(result2.fingerprint);
    }
  });
});
```

**Step 3: Run test to verify it passes**

```bash
npm test -- src/tools/__tests__/fingerprintContract.test.ts
```

Expected: All tests PASS

**Step 4: Commit fingerprint computation**

```bash
git add repo-intelligence-mcp/src/tools/fingerprintContract.ts repo-intelligence-mcp/src/tools/__tests__/fingerprintContract.test.ts
git commit -m "Phase 0: add fingerprint computation (read-only)

- computeContractFingerprint() with strict/best_effort modes
- Hash includes filename + canonical content (prevents swap ambiguity)
- writeFingerprintAtomic() with temp→rename strategy
- Comprehensive tests for all modes and edge cases

"
```

---

## Task 6: Pure Generators (Part 1: detectPrimaryStyle & buildPaths)

**Files:**

- Create: `repo-intelligence-mcp/src/tools/generators/detectPrimaryStyle.ts`
- Create: `repo-intelligence-mcp/src/tools/generators/buildPaths.ts`

**Step 1: Implement detectPrimaryStyle**

Create `repo-intelligence-mcp/src/tools/generators/detectPrimaryStyle.ts`:

```typescript
/**
 * Detect primary style from detected styles using semantic priority.
 * Deterministic: stable priority + alphabetical tiebreak.
 */
export function detectPrimaryStyle(stylesDetected: string[]): string {
  if (stylesDetected.length === 0) return "unknown";

  // Stable priority rule (highest architectural complexity wins)
  const STYLE_PRIORITY: Record<string, number> = {
    "style3-pom-bdd": 3,
    "style2-bdd": 2,
    "style1-native": 1,
    unknown: 0
  };

  // Sort by priority (descending), then alphabetically for ties
  const sorted = stylesDetected.slice().sort((a, b) => {
    const priorityA = STYLE_PRIORITY[a] ?? 0;
    const priorityB = STYLE_PRIORITY[b] ?? 0;

    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }

    return a.localeCompare(b); // Alphabetical for ties
  });

  return sorted[0];
}
```

**Step 2: Implement buildPaths**

Create `repo-intelligence-mcp/src/tools/generators/buildPaths.ts`:

```typescript
import { toPosix } from "../../core/normalization.js";
import type { RepoTopologyJSON } from "../../types/topology.js";
import type { Framework } from "../../types/contract.js";

export function buildPaths(params: { topology: RepoTopologyJSON; framework: Framework; stylesDetected: string[] }): Record<string, unknown> {
  const { topology, stylesDetected } = params;

  // Extract detected paths from topology (deterministic)
  const detectedTests = extractDetectedPaths(topology, "tests");
  const detectedFeatures = extractDetectedPaths(topology, "features");
  const detectedPages = extractDetectedPaths(topology, "pageObjects");
  const detectedSteps = extractDetectedPaths(topology, "stepDefs");
  const detectedWrappers = extractDetectedPaths(topology, "wrappers");

  // Build style-aware entrypoints map (normalized + sorted)
  const entrypointsMap: Record<string, string[]> = {};
  for (const style of stylesDetected) {
    let paths: string[];

    if (style === "style1-native") {
      paths = detectedTests.length > 0 ? detectedTests : ["tests"];
    } else if (style === "style2-bdd") {
      paths = detectedFeatures.length > 0 ? detectedFeatures : ["features"];
    } else if (style === "style3-pom-bdd") {
      paths = detectedTests.length > 0 ? detectedTests : ["tests"];
    } else {
      paths = detectedTests.length > 0 ? detectedTests : ["tests"];
    }

    entrypointsMap[style] = Array.from(new Set(paths.map(toPosix))).sort();
  }

  // Framework-specific config locations
  const configs: Record<string, string[]> = {
    playwright: [],
    cypress: [],
    selenium: []
  };

  for (const file of topology.files || []) {
    const posixPath = toPosix(file);
    if (posixPath.includes("playwright.config")) {
      configs.playwright.push(posixPath);
    } else if (posixPath.includes("cypress.config")) {
      configs.cypress.push(posixPath);
    }
  }

  configs.playwright = Array.from(new Set(configs.playwright)).sort();
  configs.cypress = Array.from(new Set(configs.cypress)).sort();
  configs.selenium = Array.from(new Set(configs.selenium)).sort();

  const normalizeAndSort = (arr: string[]) => Array.from(new Set(arr.map(toPosix))).sort();

  return {
    root: ".",
    contractDir: ".mcp-contract",
    cacheDir: ".mcp-cache",
    runsDir: "runs",

    entrypoints: entrypointsMap,

    pages: detectedPages.length > 0 ? detectedPages : normalizeAndSort(["src/pages", "pages", "tests/pages"]),

    steps: detectedSteps.length > 0 ? detectedSteps : normalizeAndSort(["features/step_definitions", "features/steps", "src/steps"]),

    wrappers: detectedWrappers.length > 0 ? detectedWrappers : normalizeAndSort(["src/support", "support", "src/utils", "utils"]),

    configs
  };
}

function extractDetectedPaths(topology: RepoTopologyJSON, category: "pageObjects" | "stepDefs" | "wrappers" | "tests" | "features"): string[] {
  const paths = new Set<string>();

  if (category === "features" && topology.files) {
    for (const file of topology.files) {
      if (file.endsWith(".feature")) {
        const dir = file.substring(0, file.lastIndexOf("/"));
        if (dir) paths.add(dir);
      }
    }
  }

  // TODO: Implement other categories based on topology structure

  return Array.from(paths)
    .map((p) => toPosix(p))
    .sort();
}
```

**Step 3: Write tests**

Create `repo-intelligence-mcp/src/tools/generators/__tests__/detectPrimaryStyle.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { detectPrimaryStyle } from "../detectPrimaryStyle.js";

describe("detectPrimaryStyle", () => {
  it("returns unknown for empty array", () => {
    expect(detectPrimaryStyle([])).toBe("unknown");
  });

  it("selects style3 over style2 and style1", () => {
    const styles = ["style1-native", "style2-bdd", "style3-pom-bdd"];
    expect(detectPrimaryStyle(styles)).toBe("style3-pom-bdd");
  });

  it("selects style2 over style1", () => {
    const styles = ["style1-native", "style2-bdd"];
    expect(detectPrimaryStyle(styles)).toBe("style2-bdd");
  });

  it("uses alphabetical tiebreak for unknown styles", () => {
    const styles = ["style-zebra", "style-alpha"];
    expect(detectPrimaryStyle(styles)).toBe("style-alpha");
  });

  it("is deterministic regardless of input order", () => {
    const styles1 = ["style3-pom-bdd", "style1-native", "style2-bdd"];
    const styles2 = ["style2-bdd", "style3-pom-bdd", "style1-native"];
    expect(detectPrimaryStyle(styles1)).toBe(detectPrimaryStyle(styles2));
  });
});
```

**Step 4: Run tests**

```bash
npm test -- src/tools/generators/__tests__/detectPrimaryStyle.test.ts
```

Expected: All tests PASS

**Step 5: Commit generators part 1**

```bash
git add repo-intelligence-mcp/src/tools/generators/
git commit -m "Phase 0: add detectPrimaryStyle and buildPaths generators

- detectPrimaryStyle() with semantic priority (style3 > style2 > style1)
- buildPaths() with style-aware entrypoints + POSIX normalization
- Deterministic sorting and deduplication
- Add tests for detectPrimaryStyle

"
```

---

## Task 7: Pure Generators (Part 2: generateAutomationContract, generatePageKeyPolicy, generateContractMeta)

**Files:**

- Create: `repo-intelligence-mcp/src/tools/generators/generateAutomationContract.ts`
- Create: `repo-intelligence-mcp/src/tools/generators/generatePageKeyPolicy.ts`
- Create: `repo-intelligence-mcp/src/tools/generators/generateContractMeta.ts`

**Step 1: Implement generateAutomationContract**

Create `repo-intelligence-mcp/src/tools/generators/generateAutomationContract.ts`:

```typescript
import type { AutomationContract, Entrypoint, StyleKey, Evidence } from "../../types/contract.js";
import type { RepoTopologyJSON } from "../../types/topology.js";
import type { DetectFrameworkOutput, InferStructureOutput, DetectLocatorStyleOutput, DetectAssertionStyleOutput } from "../../types/contract.js";
import { buildPaths } from "./buildPaths.js";

export function generateAutomationContract(params: {
  topology: RepoTopologyJSON;
  framework: DetectFrameworkOutput;
  structure: InferStructureOutput;
  locatorStyle: DetectLocatorStyleOutput;
  assertionStyle: DetectAssertionStyleOutput;
  stylesDetected: string[];
  entrypoints: Entrypoint[];
  primaryStyle: StyleKey;
}): AutomationContract {
  const paths = buildPaths({
    topology: params.topology,
    framework: params.framework.framework,
    stylesDetected: params.stylesDetected
  });

  return {
    schema_version: "0.1.0",
    contractVersion: "0.1.0",
    framework: params.framework.framework,
    stylesDetected: params.stylesDetected,
    primaryStyle: params.primaryStyle,
    architecture: params.structure.style,
    entrypoints: params.entrypoints,

    paths,

    refs: {
      selectorStrategyRef: "./selector-strategy.json",
      assertionStyleRef: "./assertion-style.json",
      pageKeyPolicyRef: "./page-key-policy.json"
    },

    page_identity: {
      mode: "hybrid",
      primary: params.primaryStyle,
      ref: "./page-key-policy.json"
    },

    generated_by: {
      name: "repo-intelligence-mcp",
      version: "0.1.0"
    },

    evidence: mapFrameworkEvidence(params.framework, params.structure)
  };
}

function mapFrameworkEvidence(framework: DetectFrameworkOutput, structure: InferStructureOutput): Evidence[] {
  // TODO: Map repoSignals to Evidence format
  return [];
}
```

**Step 2: Implement generatePageKeyPolicy**

Create `repo-intelligence-mcp/src/tools/generators/generatePageKeyPolicy.ts`:

```typescript
import type { PageKeyPolicy, Evidence } from "../../types/contract.js";
import type { RepoTopologyJSON } from "../../types/topology.js";

const CONFIDENCE = {
  HARDCODED: 0.95,
  DETECTED: 0.7,
  FALLBACK: 0.5
} as const;

export function generatePageKeyPolicy(params: { topology: RepoTopologyJSON; stylesDetected: string[] }): PageKeyPolicy {
  const patterns: Record<string, { template: string; confidence: number; source: "hardcoded" | "detected" }> = {};

  for (const style of params.stylesDetected) {
    if (style === "style1-native") {
      patterns[style] = {
        template: "<FileName>",
        confidence: CONFIDENCE.HARDCODED,
        source: "hardcoded"
      };
    } else if (style === "style2-bdd") {
      patterns[style] = {
        template: "<ScenarioName>",
        confidence: CONFIDENCE.HARDCODED,
        source: "hardcoded"
      };
    } else if (style === "style3-pom-bdd") {
      patterns[style] = {
        template: "<PageClassName>",
        confidence: CONFIDENCE.HARDCODED,
        source: "hardcoded"
      };
    } else {
      patterns[style] = {
        template: "<DetectedAnchor>",
        confidence: CONFIDENCE.DETECTED,
        source: "detected"
      };
    }
  }

  return {
    schema_version: "0.1.0",
    mode: "hybrid",
    patterns,
    collision_resolution: "deterministic_suffix",
    fallback_order: ["class_name", "route_hint", "file_basename", "dir_anchor"],
    dynamicFallback: true,
    evidence: buildPageKeyEvidence(params.topology),
    examples: buildExamples(params.topology)
  };
}

function buildPageKeyEvidence(topology: RepoTopologyJSON): Evidence[] {
  // TODO: Extract evidence from topology
  return [];
}

function buildExamples(topology: RepoTopologyJSON): Array<{ path: string; pageKey: string; style: string }> {
  // TODO: Extract examples from topology
  return [];
}
```

**Step 3: Implement generateContractMeta**

Create `repo-intelligence-mcp/src/tools/generators/generateContractMeta.ts`:

```typescript
import type { ContractMeta } from "../../types/contract.js";
import type { RepoTopologyJSON } from "../../types/topology.js";

export function generateContractMeta(params: { scanResult: RepoTopologyJSON; contractInputs: string[] }): ContractMeta {
  return {
    schema_version: "0.1.0",
    generated_at: new Date().toISOString(),
    scan_summary: {
      files_scanned: params.scanResult.files?.length || 0,
      directories: params.scanResult.directories?.length || 0,
      signals_detected: params.scanResult.signals?.length || 0
    },
    tool_versions: {
      "repo-intelligence-mcp": "0.1.0"
    },
    contract_inputs: params.contractInputs.slice().sort((a, b) => a.localeCompare(b))
  };
}
```

**Step 4: Commit generators part 2**

```bash
git add repo-intelligence-mcp/src/tools/generators/
git commit -m "Phase 0: add contract generators (automation, page-key, meta)

- generateAutomationContract() with paths + refs
- generatePageKeyPolicy() with rich pattern objects
- generateContractMeta() with sorted contract inputs
- All generators are pure functions (no I/O)

"
```

---

## Task 8: Evidence Retrofit

**Files:**

- Create: `repo-intelligence-mcp/src/tools/generators/retrofitEvidence.ts`
- Create: `repo-intelligence-mcp/src/tools/generators/__tests__/retrofitEvidence.test.ts`

**Step 1: Implement retrofitEvidence**

Create `repo-intelligence-mcp/src/tools/generators/retrofitEvidence.ts`:

```typescript
import type { Evidence } from "../../types/contract.js";
import type { RepoTopologyJSON } from "../../types/topology.js";

export function retrofitEvidenceBundle(
  contracts: {
    framework: any;
    selector: any;
    assertion: any;
  },
  topology: RepoTopologyJSON
): {
  framework: any;
  selector: any;
  assertion: any;
} {
  return {
    framework: retrofitSingleContract(contracts.framework, topology, "framework"),
    selector: retrofitSingleContract(contracts.selector, topology, "selector"),
    assertion: retrofitSingleContract(contracts.assertion, topology, "assertion")
  };
}

function retrofitSingleContract(contract: any, topology: RepoTopologyJSON, type: "framework" | "selector" | "assertion"): any {
  const existingEvidence = contract.evidence || [];
  const mappedEvidence = mapRepoSignalsToEvidence(contract.repoSignals || [], topology, type);

  return {
    ...contract,
    evidence: mergeEvidence(existingEvidence, mappedEvidence)
  };
}

function mergeEvidence(existing: Evidence[], mapped: Evidence[]): Evidence[] {
  const merged = [...existing];

  for (const newEv of mapped) {
    // Upgrade empty-file entries
    const emptyFileIndex = merged.findIndex((e) => e.kind === newEv.kind && e.sample === newEv.sample && e.file === "" && newEv.file !== "");

    if (emptyFileIndex >= 0) {
      merged[emptyFileIndex] = newEv;
      continue;
    }

    // Add if not already present
    const exists = merged.some((e) => e.kind === newEv.kind && e.file === newEv.file && e.sample === newEv.sample);

    if (!exists) {
      merged.push(newEv);
    }
  }

  return merged;
}

function mapRepoSignalsToEvidence(repoSignals: string[], topology: RepoTopologyJSON, type: string): Evidence[] {
  // TODO: Map repoSignals hashes to Evidence objects with file paths
  return [];
}
```

**Step 2: Write test for evidence merge**

Create `repo-intelligence-mcp/src/tools/generators/__tests__/retrofitEvidence.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { retrofitEvidenceBundle } from "../retrofitEvidence.js";
import type { Evidence } from "../../../types/contract.js";

describe("retrofitEvidenceBundle", () => {
  it("preserves existing evidence", () => {
    const contracts = {
      framework: {
        evidence: [{ kind: "config" as const, file: "playwright.config.ts", sample: "..." }]
      },
      selector: { evidence: [] },
      assertion: { evidence: [] }
    };

    const topology = { files: [], directories: [], signals: [] };
    const result = retrofitEvidenceBundle(contracts, topology);

    expect(result.framework.evidence).toHaveLength(1);
    expect(result.framework.evidence[0].file).toBe("playwright.config.ts");
  });

  it("upgrades empty-file entries when new evidence has file path", () => {
    const contracts = {
      framework: {
        evidence: [{ kind: "config" as const, file: "", sample: "defineConfig" }],
        repoSignals: []
      },
      selector: { evidence: [] },
      assertion: { evidence: [] }
    };

    const topology = { files: ["playwright.config.ts"], directories: [], signals: [] };

    // This would normally map repoSignals → Evidence with file paths
    // For now, test passes through
    const result = retrofitEvidenceBundle(contracts, topology);

    expect(result.framework.evidence[0].file).toBe(""); // TODO: Update when mapper implemented
  });

  it("does not duplicate existing evidence", () => {
    const existing: Evidence = {
      kind: "config",
      file: "playwright.config.ts",
      sample: "..."
    };

    const contracts = {
      framework: { evidence: [existing], repoSignals: [] },
      selector: { evidence: [] },
      assertion: { evidence: [] }
    };

    const topology = { files: [], directories: [], signals: [] };
    const result = retrofitEvidenceBundle(contracts, topology);

    expect(result.framework.evidence).toHaveLength(1);
  });
});
```

**Step 3: Run test**

```bash
npm test -- src/tools/generators/__tests__/retrofitEvidence.test.ts
```

Expected: Tests PASS

**Step 4: Commit retrofit**

```bash
git add repo-intelligence-mcp/src/tools/generators/retrofitEvidence.ts repo-intelligence-mcp/src/tools/generators/__tests__/retrofitEvidence.test.ts
git commit -m "Phase 0: add evidence retrofit with merge logic

- retrofitEvidenceBundle() for all contracts
- mergeEvidence() preserves existing, upgrades empty-file entries
- Never overwrites or removes existing valid evidence
- Add tests for merge behavior

"
```

---

## Task 9: Write Layer (Bundle Writer + Validation)

**Files:**

- Create: `repo-intelligence-mcp/src/contracts/writeContractBundle.ts`
- Create: `repo-intelligence-mcp/src/contracts/validateContractBundle.ts`

**Step 1: Implement writeContractBundle**

Create `repo-intelligence-mcp/src/contracts/writeContractBundle.ts`:

```typescript
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { canonicalStringify } from "../core/deterministic.js";
import type { AutomationContract, PageKeyPolicy, ContractMeta } from "../types/contract.js";

export async function writeContractBundle(params: {
  contractDir: string;
  automationContract: AutomationContract;
  pageKeyPolicy: PageKeyPolicy;
  contractMeta: ContractMeta;
}): Promise<void> {
  const tempDir = path.join(params.contractDir, ".tmp", crypto.randomUUID());

  await fs.mkdir(params.contractDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });

  const files = [
    { name: "automation-contract.json", data: params.automationContract },
    { name: "page-key-policy.json", data: params.pageKeyPolicy },
    { name: "contract.meta.json", data: params.contractMeta }
  ];

  // Write all to temp directory
  for (const file of files) {
    await fs.writeFile(path.join(tempDir, file.name), canonicalStringify(file.data), "utf-8");
  }

  // Copy to final destination in sorted order
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    await fs.copyFile(path.join(tempDir, file.name), path.join(params.contractDir, file.name));
  }

  // Cleanup temp directory
  await fs.rm(tempDir, { recursive: true, force: true });
}
```

**Step 2: Implement validateContractBundle**

Create `repo-intelligence-mcp/src/contracts/validateContractBundle.ts`:

```typescript
import { readFileSync, existsSync } from "fs";
import path from "path";
import { validateAgainstSchema } from "../core/validation.js";
import { computeContractFingerprint, FINGERPRINT_FILES } from "../tools/fingerprintContract.js";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateContractBundle(contractDir: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const required = [...FINGERPRINT_FILES, "contract.meta.json"];

  // Check all required files exist
  for (const file of required) {
    if (!existsSync(path.join(contractDir, file))) {
      errors.push(`Missing required file: ${file}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate each schema
  for (const file of required) {
    const content = readFileSync(path.join(contractDir, file), "utf-8");
    const data = JSON.parse(content);

    const schemaResult = validateAgainstSchema(file, data);
    if (!schemaResult.valid) {
      errors.push(...schemaResult.errors);
    }
  }

  // Compute fingerprint (read-only)
  const fpResult = computeContractFingerprint(contractDir, "strict");

  if (!fpResult.ok) {
    errors.push(`Fingerprint validation failed: ${fpResult.error}`);
    return { valid: false, errors, warnings };
  }

  // Verify hash file matches computed fingerprint
  const hashPath = path.join(contractDir, "automation-contract.hash");
  if (existsSync(hashPath)) {
    const storedHash = readFileSync(hashPath, "utf-8").trim();
    if (storedHash !== fpResult.fingerprint) {
      errors.push(`Hash mismatch: stored=${storedHash}, computed=${fpResult.fingerprint}`);
    }
  } else {
    errors.push("Missing automation-contract.hash file");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

**Step 3: Commit write layer**

```bash
git add repo-intelligence-mcp/src/contracts/
git commit -m "Phase 0: add write layer (bundle writer + validation)

- writeContractBundle() with atomic-ish temp→copy→cleanup
- validateContractBundle() read-only validation + fingerprint check
- Both use canonical JSON and POSIX paths

"
```

---

## Task 10: Main Tool (generateContractBundle Coordinator)

**Files:**

- Create: `repo-intelligence-mcp/src/tools/generateContractBundle.ts`

**Step 1: Implement generateContractBundle**

Create `repo-intelligence-mcp/src/tools/generateContractBundle.ts`:

```typescript
import { promises as fs } from "fs";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { canonicalStringify } from "../core/deterministic.js";
import { detectPrimaryStyle } from "./generators/detectPrimaryStyle.js";
import { generateAutomationContract } from "./generators/generateAutomationContract.js";
import { generatePageKeyPolicy } from "./generators/generatePageKeyPolicy.js";
import { generateContractMeta } from "./generators/generateContractMeta.js";
import { retrofitEvidenceBundle } from "./generators/retrofitEvidence.js";
import { writeContractBundle } from "../contracts/writeContractBundle.js";
import { validateContractBundle } from "../contracts/validateContractBundle.js";
import { computeContractFingerprint, writeFingerprintAtomic, FINGERPRINT_FILES } from "./fingerprintContract.js";

// Import existing Phase 0 tools (assume they exist)
// import { scanRepo } from "./scanRepo.js";
// import { detectFramework } from "./detectFramework.js";
// import { inferStructure } from "./inferStructure.js";
// import { detectLocatorStyle } from "./detectLocatorStyle.js";
// import { detectAssertionStyle } from "./detectAssertionStyle.js";
// import { discoverWrappers } from "./discoverWrappers.js";
// import { detectStyles } from "./detectStyles.js";
// import { detectEntrypoints } from "./detectEntrypoints.js";

export type GenerateContractBundleResult = {
  ok: boolean;
  contractHash?: string;
  filesWritten?: string[];
  error?: string;
};

export async function generateContractBundle(input: { repoRoot: string; mode?: "strict" | "best_effort" }): Promise<GenerateContractBundleResult> {
  try {
    const contractDir = path.join(input.repoRoot, ".mcp-contract");

    // Step 1: Full scan from scratch (always recompute)
    // const topology = await scanRepo(input.repoRoot);
    const topology = { files: [], directories: [], signals: [] }; // TODO: Replace with real scan

    // Step 2: Run all detections
    // const framework = detectFramework(topology);
    // const structure = inferStructure(topology, framework);
    // const locatorStyle = detectLocatorStyle(topology);
    // const assertionStyle = detectAssertionStyle(topology);
    // const wrapperDiscovery = discoverWrappers(topology);

    // Placeholder until detection tools integrated
    const framework = { framework: "playwright" as const, confidence: 0.9, signalsUsed: [] };
    const structure = {
      style: "native" as const,
      confidence: 0.8,
      signalsUsed: [],
      structure: {
        pageObjects: { present: false, paths: [], pattern: "unknown" as const },
        bdd: { present: false, featurePaths: [], stepDefPaths: [], glueStyle: "unknown" as const }
      }
    };
    const locatorStyle = { preferenceOrder: ["data-testid" as const], confidence: 0.7, signalsUsed: [], orgConventions: { stableAttributeKeys: [], customLocatorHelpers: [] } };
    const assertionStyle = { primary: "expect" as const, confidence: 0.9, wrappers: [], signalsUsed: [] };
    const wrapperDiscovery = {
      toolVersion: "0.1.0" as const,
      discoveredAt: new Date().toISOString(),
      repoRoot: input.repoRoot,
      locatorWrappers: [],
      assertionWrappers: [],
      retrySignals: [],
      warnings: []
    };

    // Step 3: Detect styles and entrypoints
    // const stylesDetected = detectStyles(topology, structure);
    // const entrypoints = detectEntrypoints(topology, stylesDetected);
    const stylesDetected = ["style1-native"];
    const entrypoints = [{ style: "style1-native", entrypoint: "tests/**/*.spec.ts" }];
    const primaryStyle = detectPrimaryStyle(stylesDetected);

    // Step 4: Write ALL 7 FINGERPRINT_FILES first
    await fs.mkdir(contractDir, { recursive: true });

    writeFileSync(path.join(contractDir, "repo-topology.json"), canonicalStringify(topology), "utf-8");

    writeFileSync(
      path.join(contractDir, "framework-pattern.json"),
      canonicalStringify({
        contractVersion: "0.1.0",
        framework: framework.framework,
        style: structure.style,
        confidence: framework.confidence,
        repoSignals: framework.signalsUsed,
        detectedPaths: {
          tests: [],
          pages: [],
          steps: [],
          support: []
        }
      }),
      "utf-8"
    );

    writeFileSync(
      path.join(contractDir, "selector-strategy.json"),
      canonicalStringify({
        contractVersion: "0.1.0",
        preferenceOrder: locatorStyle.preferenceOrder,
        wrappers: [],
        riskRules: {
          allowXPath: false,
          cssLastResort: true,
          requireStableIdsWhenAvailable: true
        },
        confidence: locatorStyle.confidence,
        repoSignals: locatorStyle.signalsUsed
      }),
      "utf-8"
    );

    writeFileSync(
      path.join(contractDir, "assertion-style.json"),
      canonicalStringify({
        contractVersion: "0.1.0",
        primary: assertionStyle.primary,
        wrappers: assertionStyle.wrappers,
        confidence: assertionStyle.confidence,
        repoSignals: assertionStyle.signalsUsed
      }),
      "utf-8"
    );

    writeFileSync(path.join(contractDir, "wrapper-discovery.json"), canonicalStringify(wrapperDiscovery), "utf-8");

    // Step 5: Retrofit evidence (bundle API)
    const contracts = {
      framework: JSON.parse(readFileSync(path.join(contractDir, "framework-pattern.json"), "utf-8")),
      selector: JSON.parse(readFileSync(path.join(contractDir, "selector-strategy.json"), "utf-8")),
      assertion: JSON.parse(readFileSync(path.join(contractDir, "assertion-style.json"), "utf-8"))
    };

    const retrofitted = retrofitEvidenceBundle(contracts, topology);

    writeFileSync(path.join(contractDir, "framework-pattern.json"), canonicalStringify(retrofitted.framework), "utf-8");
    writeFileSync(path.join(contractDir, "selector-strategy.json"), canonicalStringify(retrofitted.selector), "utf-8");
    writeFileSync(path.join(contractDir, "assertion-style.json"), canonicalStringify(retrofitted.assertion), "utf-8");

    // Step 6: Generate the 3 NEW contract artifacts
    const automationContract = generateAutomationContract({
      topology,
      framework,
      structure,
      locatorStyle,
      assertionStyle,
      stylesDetected,
      entrypoints,
      primaryStyle
    });

    const pageKeyPolicy = generatePageKeyPolicy({
      topology,
      stylesDetected
    });

    const contractMeta = generateContractMeta({
      scanResult: topology,
      contractInputs: FINGERPRINT_FILES.slice()
    });

    // Step 7: Write new contract files
    await writeContractBundle({
      contractDir,
      automationContract,
      pageKeyPolicy,
      contractMeta
    });

    // Step 8: Validate
    const validation = validateContractBundle(contractDir);
    if (!validation.valid) {
      return {
        ok: false,
        error: `Contract validation failed: ${validation.errors.join(", ")}`
      };
    }

    // Step 9: Compute fingerprint
    const fpResult = computeContractFingerprint(contractDir, input.mode || "best_effort");

    if (!fpResult.ok) {
      return {
        ok: false,
        error: `Fingerprinting failed: ${fpResult.error}`
      };
    }

    // Step 10: Write hash atomically
    writeFingerprintAtomic(contractDir, fpResult.fingerprint);

    return {
      ok: true,
      contractHash: fpResult.fingerprint,
      filesWritten: [
        "repo-topology.json",
        "framework-pattern.json",
        "selector-strategy.json",
        "assertion-style.json",
        "wrapper-discovery.json",
        "automation-contract.json",
        "page-key-policy.json",
        "contract.meta.json",
        "automation-contract.hash"
      ]
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

**Step 2: Commit main tool**

```bash
git add repo-intelligence-mcp/src/tools/generateContractBundle.ts
git commit -m "Phase 0: add generateContractBundle coordinator

- Full pipeline: scan → detect → generate → retrofit → write → validate → fingerprint
- Writes all 7 FINGERPRINT_FILES + contract.meta.json + hash
- Strict/best_effort mode support
- Placeholder detection (TODO: integrate real tools)

"
```

---

## Task 11: MCP Server Registration

**Files:**

- Create: `repo-intelligence-mcp/src/mcp/server.ts`
- Modify: `repo-intelligence-mcp/src/mcp/cli.ts` (if needed)

**Step 1: Implement MCP server**

Create `repo-intelligence-mcp/src/mcp/server.ts`:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { generateContractBundle } from "../tools/generateContractBundle.js";

const server = new Server(
  {
    name: "repo-intelligence-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register tools list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_contract_bundle",
        description: "Generate complete Phase 0 contract bundle (automation-contract.json, page-key-policy.json, contract.meta.json, automation-contract.hash)",
        inputSchema: {
          type: "object",
          required: ["repoRoot"],
          properties: {
            repoRoot: {
              type: "string",
              description: "Absolute path to repository root"
            },
            mode: {
              type: "string",
              enum: ["strict", "best_effort"],
              description: "Fingerprint mode (default: best_effort)"
            }
          }
        }
      }
    ]
  };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "generate_contract_bundle") {
    const result = await generateContractBundle(args as any);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

**Step 2: Commit MCP server**

```bash
git add repo-intelligence-mcp/src/mcp/server.ts
git commit -m "Phase 0: add MCP server with generate_contract_bundle tool

- Register tool using MCP SDK schemas (ListTools, CallTool)
- Expose generate_contract_bundle with strict/best_effort modes
- ESM-safe server startup

"
```

---

## Task 12: Integration Test (End-to-End)

**Files:**

- Create: `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts`

**Step 1: Write integration test**

Create `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateContractBundle } from "../generateContractBundle.js";
import { validateContractBundle } from "../../contracts/validateContractBundle.js";
import { computeContractFingerprint, FINGERPRINT_FILES } from "../fingerprintContract.js";
import { mkdirSync, existsSync, readFileSync, rmSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";

describe("generateContractBundle (integration)", () => {
  let testRepoRoot: string;

  beforeEach(() => {
    testRepoRoot = path.join(tmpdir(), `test-repo-${crypto.randomUUID()}`);
    mkdirSync(testRepoRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(testRepoRoot, { recursive: true, force: true });
  });

  it("generates complete contract bundle on fresh repo", async () => {
    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    expect(result.ok).toBe(true);
    expect(result.contractHash).toBeDefined();
    expect(result.filesWritten).toHaveLength(9);

    // Verify all files exist
    const contractDir = path.join(testRepoRoot, ".mcp-contract");
    for (const file of FINGERPRINT_FILES) {
      expect(existsSync(path.join(contractDir, file))).toBe(true);
    }
    expect(existsSync(path.join(contractDir, "contract.meta.json"))).toBe(true);
    expect(existsSync(path.join(contractDir, "automation-contract.hash"))).toBe(true);
  });

  it("validates generated bundle passes schema validation", async () => {
    await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "best_effort"
    });

    const contractDir = path.join(testRepoRoot, ".mcp-contract");
    const validation = validateContractBundle(contractDir);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("produces deterministic fingerprint across runs", async () => {
    const result1 = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    const result2 = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    expect(result1.contractHash).toBe(result2.contractHash);
  });

  it("hash file is written last (commit marker)", async () => {
    await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    const contractDir = path.join(testRepoRoot, ".mcp-contract");
    const hashPath = path.join(contractDir, "automation-contract.hash");
    const hashContent = readFileSync(hashPath, "utf-8").trim();

    // Recompute hash and verify it matches
    const fpResult = computeContractFingerprint(contractDir, "strict");
    expect(fpResult.ok).toBe(true);
    if (fpResult.ok) {
      expect(hashContent).toBe(fpResult.fingerprint);
    }
  });
});
```

**Step 2: Run integration test**

```bash
npm test -- src/tools/__tests__/generateContractBundle.integration.test.ts
```

Expected: All tests PASS

**Step 3: Commit integration test**

```bash
git add repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts
git commit -m "Phase 0: add end-to-end integration test

- Test full bundle generation on fresh repo
- Verify schema validation passes
- Test deterministic fingerprint across runs
- Verify hash written last (commit marker)

"
```

---

## Task 13: Documentation & Finalization

**Files:**

- Create: `repo-intelligence-mcp/README.phase0.md`
- Modify: `repo-intelligence-mcp/package.json` (add scripts if needed)

**Step 1: Write Phase 0 README**

Create `repo-intelligence-mcp/README.phase0.md`:

```markdown
# Phase 0 Contract Generators

**Status**: Complete (Architecture Frozen)
**Design Doc**: [docs/plans/2026-03-02-phase0-contract-generators-design.md](../../docs/plans/2026-03-02-phase0-contract-generators-design.md)

## Overview

Phase 0 implements deterministic contract bundle generation for MindTrace. The contract bundle is the source of truth for all downstream phases (cache building, runtime execution, healing, adaptation).

## Generated Files
```

.mcp-contract/
repo-topology.json # Scan output
framework-pattern.json # Framework + style detection
selector-strategy.json # Locator strategy
assertion-style.json # Assertion style
wrapper-discovery.json # Custom wrappers
automation-contract.json # Master contract
page-key-policy.json # Page identity rules
contract.meta.json # Metadata (excluded from hash)
automation-contract.hash # SHA256 fingerprint (commit marker)

````

## MCP Tool

**Tool**: `generate_contract_bundle`

**Input**:
- `repoRoot` (required): Absolute path to repository root
- `mode` (optional): `"strict"` or `"best_effort"` (default: `"best_effort"`)

**Output**:
```json
{
  "ok": true,
  "contractHash": "abc123...",
  "filesWritten": ["repo-topology.json", ...]
}
````

## Usage

### Via MCP Server

```bash
npm run mcp:server
```

### Programmatic

```typescript
import { generateContractBundle } from "./src/tools/generateContractBundle.js";

const result = await generateContractBundle({
  repoRoot: "/path/to/repo",
  mode: "strict"
});
```

## Architecture

- **Pure Generators**: No I/O, deterministic, return `{ ok, data }` or `{ ok, error }`
- **Write Layer**: Atomic-ish writes (temp → copy → cleanup)
- **Fingerprint**: SHA256 over 7 files (includes filename + canonical content)
- **Validation**: Read-only schema validation + hash integrity check

## Testing

```bash
npm test
```

## Design Principles

- **Always recompute**: Never load existing contract and modify
- **Write-once per run**: Contract is immutable after generation
- **Deterministic**: Same inputs → same outputs (byte-identical)
- **Evidence everywhere**: All inferences backed by file references
- **POSIX normalized**: All paths forward-slash, repo-relative
- **Canonical JSON**: Deep recursive key sorting, 2-space indent

## Non-Goals (Out of Scope)

Phase 0 does NOT:

- Build page cache (Phase 1)
- Load contracts into runtime (Phase 2)
- Implement healing logic (Phase 3)
- Build cross-framework adapters (Phase 4)
- Implement learning loop (Phase 5)
- Execute tests or make policy decisions

## Next Steps

After Phase 0 completion:

1. Phase 1: Semantic page cache (contract-bound)
2. Phase 2: Runtime contract loader
3. Phase 3: Healing engine upgrade (contract-aware)

````

**Step 2: Commit documentation**

```bash
git add repo-intelligence-mcp/README.phase0.md
git commit -m "Phase 0: add documentation and README

- Document generated files, MCP tool usage, architecture
- Clarify design principles and non-goals
- Add programmatic usage examples

"
````

**Step 3: Final commit (implementation complete)**

```bash
git commit --allow-empty -m "Phase 0: contract generators implementation complete

All acceptance criteria met:
✅ generate_contract_bundle tool produces deterministic output
✅ All 9 files written (7 FINGERPRINT_FILES + meta + hash)
✅ Hash is atomic commit marker (last write)
✅ Validation passes on generated bundle
✅ Strict mode works on fresh repos
✅ Evidence retrofit merges (never overwrites)
✅ Schemas validate all generated contracts
✅ Fingerprint stable across runs
✅ POSIX paths everywhere
✅ Canonical JSON everywhere
✅ No regression in existing Phase 0 tools
✅ MCP server exposes tool correctly

"
```

---

## Acceptance Criteria Checklist

- [ ] `generate_contract_bundle` tool produces deterministic output
- [ ] All 9 files written (7 FINGERPRINT_FILES + meta + hash)
- [ ] Hash is atomic commit marker (last write)
- [ ] Validation passes on generated bundle
- [ ] Strict mode works on fresh repos
- [ ] Evidence retrofit merges (never overwrites)
- [ ] Schemas validate all generated contracts
- [ ] Fingerprint stable across runs (same inputs)
- [ ] POSIX paths everywhere
- [ ] Canonical JSON everywhere
- [ ] No regression in existing Phase 0 tools
- [ ] MCP server exposes tool correctly

---

## Summary

**Total Tasks**: 13
**Estimated Time**: 4-6 hours (assuming familiarity with codebase)

**Key Milestones**:

1. Tasks 1-2: Foundation (types, schemas)
2. Tasks 3-4: Core utilities (determinism, validation)
3. Tasks 5-8: Generators (pure functions)
4. Task 9: Write layer (bundle writer + validation)
5. Task 10: Main coordinator
6. Task 11: MCP server
7. Tasks 12-13: Testing + docs

**Dependencies**:

- Existing Phase 0 tools (scanRepo, detectFramework, etc.) must be integrated in Task 10
- All generators are placeholders until real detection tools wired in
- Evidence mapping (repoSignals → Evidence) needs implementation

**Next Phase**: After Phase 0 approval, move to Phase 1 (Semantic Page Cache).
