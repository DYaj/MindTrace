# Phase 1: Real Detection & Contract-Derived Page Cache

**Status**: Design Complete (Ready for Implementation)
**Date**: 2026-03-03
**Prerequisites**: Phase 0 Contract Generators (Complete)

## Overview

Phase 1 replaces Phase 0's placeholder detection data with real repository scanning and detection, and optionally builds a contract-derived page cache for runtime consumption.

**Core Principles:**
- ✅ **Contract as single source of truth** - Cache is derived from contract, not repo
- ✅ **Deterministic** - Same repo → byte-identical contracts + cache
- ✅ **Hash-linked** - Cache includes `contractSha256` for drift detection
- ✅ **Optional cache** - `buildCache: false` by default (enterprise-safe)
- ✅ **Strict validation** - Both contract and cache must pass schema validation
- ✅ **Backward compatible** - Legacy `.mindtrace/contracts/` read fallback

**Key Changes from Phase 0:**

| Aspect | Phase 0 | Phase 1 |
|--------|---------|---------|
| Repository scan | Hardcoded empty topology | Real `scanRepo()` with signal generation |
| Framework detection | Hardcoded "playwright" | Real `detectFramework()` |
| Structure inference | Hardcoded "native" | Real `inferStructure()` (BDD/POM/Native/Hybrid) |
| Locator style | Hardcoded preferences | Real `detectLocatorStyle()` from signals |
| Assertion style | Hardcoded "expect" | Real `detectAssertionStyle()` from signals |
| Page cache | N/A | Optional contract-derived cache |
| Output location | `.mindtrace/contracts/` | `.mcp-contract/` (canonical) |

---

## Architecture & Data Flow

### High-Level Pipeline

```
Repository
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Detection & Contract Generation                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  scanRepo({ rootPath }) → RepoTopologyJSON                     │
│    • File enumeration (fast-glob)                              │
│    • Signal generation (framework, BDD, POM, locators, etc.)   │
│    • Language stats, config files, test surface                │
│       ↓                                                         │
│  Detection Functions:                                           │
│    • detectFramework(topology) → { framework, confidence, ... }│
│    • inferStructure(topology) → { style, structure, ... }      │
│    • detectLocatorStyle(topology) → { preferenceOrder, ... }   │
│    • detectAssertionStyle(topology) → { primary, ... }         │
│    • discoverWrappers({ topology }) → { wrappers[] }           │
│       ↓                                                         │
│  Generate Contract Components (Phase 0 unchanged):             │
│    • generateAutomationContract(params) → AutomationContract   │
│    • generatePageKeyPolicy(params) → PageKeyPolicy             │
│    • generateContractMeta(params) → ContractMeta               │
│       ↓                                                         │
│  Write Contract Bundle → .mcp-contract/*.json                  │
│    • automation-contract.json                                  │
│    • page-key-policy.json                                      │
│    • contract.meta.json                                        │
│    • (+ detection artifacts: selector-strategy.json, etc.)     │
│       ↓                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  FINGERPRINT BOUNDARY (canonical JSON only, no metadata)       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│       ↓                                                         │
│  computeContractFingerprint(contractDir, mode)                 │
│    • Input: Explicit manifest of identity files (sorted)       │
│    • Process: Canonical JSON (deep key sort) → SHA256          │
│    • Output: contract.fingerprint.sha256                       │
│    • ✅ NO filesystem metadata, timestamps, absolute paths     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Optional Cache Generation (if buildCache: true)       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  CACHE DERIVATION BOUNDARY (contract bundle only)              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│       ↓                                                         │
│  Read Contract Bundle from .mcp-contract/                      │
│    • automation-contract.json                                  │
│    • page-key-policy.json                                      │
│       ↓                                                         │
│  buildPageCache({                                              │
│    automationContract,  // ✅ FROM contract (read from disk)   │
│    pageKeyPolicy,       // ✅ FROM contract (read from disk)   │
│    contractSha256       // ✅ FROM fingerprint file            │
│  })                                                             │
│    • ✅ NO access to RepoTopologyJSON                          │
│    • ✅ NO access to scanner output                            │
│    • ✅ Purely contract-derived                                │
│       ↓                                                         │
│  Write Page Cache → .mcp-cache/pages/<pageId>.json            │
│    • One file per page (deterministic pageId)                  │
│    • Each file includes: { contractSha256, schemaVersion, ... }│
│       ↓                                                         │
│  Optional Index → .mcp-cache/index.json                        │
│    • List of all pageIds with metadata                         │
│    • Includes contractSha256 for drift check                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Critical Boundaries

**1. Fingerprint Boundary (Phase 0 - unchanged, now with real data):**
- Input: Canonical JSON from identity files ONLY
- Process: Deep recursive key sorting → SHA256 hash
- Output: `contract.fingerprint.sha256`
- ✅ NO `fs.stat()`, timestamps, absolute paths, write order
- ✅ Explicit manifest-driven (all identity files listed)

**2. Cache Derivation Boundary (Phase 1 - NEW):**
- Input: Contract bundle files from `.mcp-contract/` + `contractSha256`
- Process: Pure transformation of contract data → page metadata
- Output: `.mcp-cache/pages/*.json`
- ✅ NO access to `RepoTopologyJSON`
- ✅ NO access to scanner output
- ✅ NO imports that can reach scan results
- ✅ Cache builder signature FORBIDS raw repo data

---

## Component Details

### 1. Repository Scanner (Phase 1 - replaces placeholder)

```typescript
// Location: repo-intelligence-mcp/src/tools/scanRepo.ts
export async function scanRepo(input: ScanRepoInput): Promise<RepoTopologyJSON>

// Input:
type ScanRepoInput = {
  rootPath: string;
  ignore?: { dirs?: string[]; globs?: string[] };
  limits?: { maxFiles?: number; maxFileBytes?: number };
};

// Output:
type RepoTopologyJSON = {
  toolVersion: string;
  scannedAt: string; // ISO timestamp (for provenance, NOT hashed)
  repoRoot: string;
  files: { count: number; paths: string[] };
  directories: string[];
  packageManagers: { /* ... */ };
  languageStats: Record<string, number>;
  configFiles: string[];
  testSurface: { candidateTestDirs: string[]; candidateSupportDirs: string[] };
  signals: Signal[];  // Framework, BDD, POM, locator hints
  warnings: string[];
};
```

**Signal Types Generated:**
- `framework-indicator` - Config files, dependencies (Playwright, Cypress, Selenium)
- `bdd-indicator` - `.feature` files, step definitions, Cucumber/Gherkin imports
- `pom-indicator` - Page object directories/patterns
- `locator-style` - `data-testid`, `data-qa`, `data-cy`, `getByRole()`, etc.
- `assertion-indicator` - `expect()`, `.should()`, etc.

### 2. Detection Functions (Phase 1 - replaces placeholders)

```typescript
// Location: repo-intelligence-mcp/src/tools/infer.ts

export function detectFramework(topology: RepoTopologyJSON): DetectFrameworkOutput {
  framework: "playwright" | "cypress" | "selenium" | "unknown";
  confidence: number; // 0.0-1.0
  signalsUsed: string[]; // Signal IDs used for detection
  notes: string[]; // Human-readable explanation
}

export function inferStructure(topology: RepoTopologyJSON): InferStructureOutput {
  style: "native" | "bdd" | "pom" | "hybrid";
  confidence: number;
  signalsUsed: string[];
  structure: {
    pageObjects: { present: boolean; paths: string[]; pattern: string };
    bdd: { present: boolean; featurePaths: string[]; stepDefPaths: string[]; glueStyle: string };
  };
}

export function detectLocatorStyle(topology: RepoTopologyJSON): DetectLocatorStyleOutput {
  preferenceOrder: Array<"data-testid" | "data-qa" | "data-cy" | "role" | "labelText" | "placeholder" | "css" | "xpath">;
  confidence: number;
  signalsUsed: string[];
  orgConventions: { stableAttributeKeys: string[]; customLocatorHelpers: string[] };
}

export function detectAssertionStyle(topology: RepoTopologyJSON): DetectAssertionStyleOutput {
  primary: "expect" | "should" | "assert" | "custom";
  confidence: number;
  wrappers: string[]; // Custom assertion wrappers detected
  signalsUsed: string[];
}
```

### 3. Page Cache Builder (Phase 1 - NEW)

```typescript
// Location: repo-intelligence-mcp/src/tools/buildPageCache.ts

export async function buildPageCache(params: {
  automationContract: AutomationContract;  // ✅ FROM contract bundle
  pageKeyPolicy: PageKeyPolicy;            // ✅ FROM contract bundle
  contractSha256: string;                  // ✅ FROM fingerprint
  outputDir: string;                       // .mcp-cache/
}): Promise<PageCacheIndex>

// Output Structure:
// .mcp-cache/
//   index.json              (optional index with all pageIds)
//   pages/
//     <pageId>.json        (one file per page)

// Per-Page Schema:
type PageCacheEntry = {
  pageId: string;              // ✅ Deterministic (from contract page identity)
  contractSha256: string;      // ✅ Hash link to contract
  schemaVersion: string;       // ✅ Cache schema version
  generatedBy: string;         // ✅ "repo-intelligence-mcp@0.2.0"
  // ❌ NO generatedAt timestamp
  // ❌ NO filesystem metadata
  page: {
    path: string;              // Canonical POSIX path
    semanticRole: string;      // login, dashboard, checkout, etc.
    selectors: Array<{ /* ... */ }>;
    actions: Array<{ /* ... */ }>;
    // ... other page metadata from contract
  };
};
```

**Critical: Cache Builder Boundary Enforcement**

```typescript
// ✅ CORRECT: Read contract from disk
export async function buildPageCache(params: {
  automationContract: AutomationContract;  // Parsed from .mcp-contract/automation-contract.json
  pageKeyPolicy: PageKeyPolicy;            // Parsed from .mcp-contract/page-key-policy.json
  contractSha256: string;                  // Read from .mcp-contract/contract.fingerprint.sha256
  outputDir: string;
}) { /* ... */ }

// ❌ FORBIDDEN: Direct access to scan output
// This signature is REJECTED by design:
export async function buildPageCache(params: {
  topology: RepoTopologyJSON;  // ❌ NO - bypasses contract boundary
  // ...
}) { /* ... */ }
```

### 4. Updated generateContractBundle (Phase 1)

```typescript
// Location: repo-intelligence-mcp/src/tools/generateContractBundle.ts

export async function generateContractBundle(params: {
  repoRoot: string;
  mode?: "strict" | "best_effort";  // Default: "best_effort"
  buildCache?: boolean;              // ✅ NEW: Default false
}): Promise<GenerateContractBundleResult>

export type GenerateContractBundleResult =
  | { ok: true; contractSha256: string; filesWritten: string[] }  // ✅ Named contractSha256 (not "hash")
  | { ok: false; error: string };
```

---

## Determinism Guarantees

### 1. Byte-Identical Contracts

**Guarantee:** Running Phase 1 twice on unchanged repo → identical `.mcp-contract/*.json` bytes

**Enforcement:**
- ✅ Canonical JSON sorting (deep recursive key sort)
- ✅ POSIX path normalization (cross-platform consistency)
- ✅ Deterministic signal generation (sorted by ID)
- ✅ Deterministic framework scoring (priority + alphabetical tiebreak)
- ✅ NO timestamps in contract files (except provenance metadata not included in hash)

### 2. Byte-Identical Cache

**Guarantee:** Running Phase 1 twice on unchanged repo → identical `.mcp-cache/pages/*.json` bytes

**Enforcement:**
- ✅ Cache is purely derived from contract bundle (no repo timestamps/metadata)
- ✅ Deterministic `pageId` generation (from contract page identity, NOT filesystem order)
- ✅ Canonical JSON sorting in cache files
- ✅ NO timestamps in cache files (use `generatedBy: "repo-intelligence-mcp@<version>"`)

### 3. Hash Stability

**Guarantee:** Same contract → same `contractSha256`

**Fingerprint Input Manifest (Explicit):**

```typescript
// MUST VERIFY: Are these ALL identity files?
const FINGERPRINT_FILES = [
  "automation-contract.json",
  "page-key-policy.json",
  "contract.meta.json",
  // TODO Phase 1: Verify if these are part of identity:
  // "selector-strategy.json",     // If yes, add to manifest
  // "repo-topology.json",          // If yes, add to manifest
  // "assertion-style.json",        // If yes, add to manifest
  // "framework-pattern.json",      // If yes, add to manifest
] as const;

// Rule: Whatever governance treats as "the contract" must be in the fingerprint set.
// Ambiguity in identity files → silent drift risk.
```

**Fingerprint Computation (Phase 0 - unchanged, now verified):**

```typescript
export function computeContractFingerprint(
  contractDir: string,
  mode: "strict" | "best_effort"
): { ok: true; fingerprint: string } | { ok: false; error: string } {
  // 1. Read ONLY the files in FINGERPRINT_FILES manifest
  // 2. For each file: canonicalStringify(JSON.parse(content))
  // 3. Concatenate: filename + "\0" + canonicalJSON + "\0"
  // 4. SHA256 hash the concatenated string
  // 5. Return hex-encoded hash

  // ✅ NO fs.stat() calls
  // ✅ NO timestamps
  // ✅ NO absolute paths (all paths in JSON are POSIX relative)
  // ✅ NO write order dependency (manifest is sorted)
}
```

### 4. Cache Page Identity

**Deterministic `pageId` Generation:**

```typescript
// ✅ CORRECT: Derived from contract page identity
function generatePageId(page: PageFromContract): string {
  // Use contract-provided canonical path (POSIX normalized)
  const canonicalPath = page.path; // Already POSIX from contract
  return slugify(canonicalPath);   // e.g., "src__pages__Login.ts" → "src__pages__Login"
}

// ❌ FORBIDDEN: Derived from filesystem order
function generatePageId(files: string[]): string {
  return files.sort()[0]; // ❌ NO - filesystem order is non-deterministic
}
```

---

## Error Handling & Validation

### 1. Repository Scan Failures

```typescript
// Abstract error handling (implementation matches actual scanRepo behavior)

try {
  const topology = await scanRepo({ rootPath: params.repoRoot });
} catch (error) {
  // If scanRepo throws → fail immediately
  return {
    ok: false,
    error: `Repository scan failed: ${error.message}`
  };
}

// If scanRepo returns warnings but succeeds → include in contract metadata
if (topology.warnings.length > 0) {
  contractMeta.warnings = topology.warnings;
}
```

### 2. Low Confidence Detection

**Policy by Mode:**

- **`best_effort` mode (default):**
  - Low confidence (< 0.3) → log warning, continue with best guess
  - Include confidence scores in contract for downstream visibility

- **`strict` mode:**
  - Low confidence below threshold → FAIL (or require explicit `--allow-low-confidence` flag)
  - Ensures enterprise CI only proceeds with high-confidence detection

```typescript
const framework = detectFramework(topology);

if (params.mode === "strict" && framework.confidence < 0.5) {
  return {
    ok: false,
    error: `Strict mode: Low confidence framework detection (${framework.framework}: ${framework.confidence}). ` +
           `Use --mode=best_effort or verify repository has clear framework indicators.`
  };
}

if (framework.confidence < 0.3) {
  warnings.push(
    `Low confidence framework detection: ${framework.framework} (${framework.confidence})`
  );
}
```

### 3. Contract Validation

```typescript
// After writing contract bundle
const validation = await validateContractBundle(contractDir);

if (!validation.valid) {
  return {
    ok: false,
    error: `Contract validation failed: ${validation.errors.join(", ")}`
  };
}
```

### 4. Cache Validation (if buildCache: true)

```typescript
// After writing page cache
const cacheValidation = await validatePageCache(cacheDir);

if (!cacheValidation.valid) {
  return {
    ok: false,
    error: `Cache validation failed: ${cacheValidation.errors.join(", ")}`
  };
}
```

### 5. Cache Drift Detection (Phase 2 Runtime - enforcement only)

**Phase 1 Responsibility:** Guarantee `contractSha256` link exists in cache

**Phase 2 Responsibility:** Enforce cache freshness at runtime

```typescript
// Phase 2 runtime will enforce:
const cache = await readPageCache(cacheDir);
const contract = await readContract(contractDir);

if (cache.contractSha256 !== contract.fingerprint) {
  throw new Error(
    `Cache is stale (contract updated). ` +
    `Expected: ${contract.fingerprint}, Got: ${cache.contractSha256}. ` +
    `Rebuild cache: mindtrace phase1 --build-cache`
  );
}
```

---

## Testing Strategy

### 1. Integration Test: Real Detection on Actual Repo

```typescript
it("generates contract using real detection on actual repository", async () => {
  // Use actual test repo with known framework/structure
  const testRepoRoot = path.join(__dirname, "fixtures/sample-playwright-repo");

  const result = await generateContractBundle({
    repoRoot: testRepoRoot,
    mode: "strict"
  });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  // Read generated contract
  const contractPath = path.join(testRepoRoot, ".mcp-contract/automation-contract.json");
  const contract = JSON.parse(await fs.readFile(contractPath, "utf-8"));

  // Verify real detection results match known repo
  expect(contract.framework).toBe("playwright");
  expect(contract.structure.style).toBe("native"); // Known structure
  expect(contract.locatorStyle.preferenceOrder).toContain("role");
});
```

### 2. Integration Test: Contract-Derived Cache Generation

```typescript
it("builds contract-derived page cache when buildCache: true", async () => {
  const result = await generateContractBundle({
    repoRoot: testRepoRoot,
    buildCache: true
  });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  // Verify cache directory exists
  const cachePath = path.join(testRepoRoot, ".mcp-cache/pages");
  expect(await fs.access(cachePath).then(() => true).catch(() => false)).toBe(true);

  // Verify all cache files include contractSha256 hash link
  const cacheFiles = await fs.readdir(cachePath);
  for (const file of cacheFiles) {
    const cacheEntry = JSON.parse(
      await fs.readFile(path.join(cachePath, file), "utf-8")
    );

    expect(cacheEntry.contractSha256).toBe(result.contractSha256);
    expect(cacheEntry.schemaVersion).toBeDefined();
    expect(cacheEntry.pageId).toBeDefined();
    expect(cacheEntry.generatedAt).toBeUndefined(); // NO timestamp
  }
});
```

### 3. Determinism Test: Byte-Identical Outputs Across Runs

```typescript
it("produces byte-identical contracts and cache across independent runs", async () => {
  // Create two separate temp directories
  const tmp1 = await fs.mkdtemp(path.join(os.tmpdir(), "phase1-test-1-"));
  const tmp2 = await fs.mkdtemp(path.join(os.tmpdir(), "phase1-test-2-"));

  try {
    // Copy test repo to both temp directories
    await copyRepo(testRepoFixture, tmp1);
    await copyRepo(testRepoFixture, tmp2);

    // Run contract generation twice independently
    const result1 = await generateContractBundle({
      repoRoot: tmp1,
      buildCache: true
    });

    const result2 = await generateContractBundle({
      repoRoot: tmp2,
      buildCache: true
    });

    // Verify hash is identical
    expect(result1.contractSha256).toBe(result2.contractSha256);

    // Verify contract file bytes are identical
    const contract1Bytes = await fs.readFile(
      path.join(tmp1, ".mcp-contract/automation-contract.json")
    );
    const contract2Bytes = await fs.readFile(
      path.join(tmp2, ".mcp-contract/automation-contract.json")
    );
    expect(contract1Bytes.equals(contract2Bytes)).toBe(true);

    // Verify cache file bytes are identical
    const cache1Files = await fs.readdir(path.join(tmp1, ".mcp-cache/pages"));
    const cache2Files = await fs.readdir(path.join(tmp2, ".mcp-cache/pages"));
    expect(cache1Files.sort()).toEqual(cache2Files.sort());

    for (const file of cache1Files) {
      const cache1Bytes = await fs.readFile(
        path.join(tmp1, ".mcp-cache/pages", file)
      );
      const cache2Bytes = await fs.readFile(
        path.join(tmp2, ".mcp-cache/pages", file)
      );
      expect(cache1Bytes.equals(cache2Bytes)).toBe(true);
    }
  } finally {
    await fs.rm(tmp1, { recursive: true, force: true });
    await fs.rm(tmp2, { recursive: true, force: true });
  }
});
```

### 4. Type-Level Boundary Test: Cache Cannot Access Raw Scan

```typescript
// Type-level test using tsd (compile-time enforcement)
// Location: repo-intelligence-mcp/src/tools/__tests__/buildPageCache.test-d.ts

import { expectError } from "tsd";
import { buildPageCache } from "../buildPageCache.js";
import type { RepoTopologyJSON } from "../../types/topology.js";

// ✅ Valid signature
buildPageCache({
  automationContract: mockContract,
  pageKeyPolicy: mockPolicy,
  contractSha256: "abc123...",
  outputDir: ".mcp-cache"
});

// ❌ Invalid signature - should fail at compile time
expectError(
  buildPageCache({
    topology: mockTopology as RepoTopologyJSON, // ❌ Type error: no topology parameter
    contractSha256: "abc123...",
    outputDir: ".mcp-cache"
  })
);
```

### 5. Cache Drift Detection Test

```typescript
it("detects cache staleness when contract changes", async () => {
  // Generate initial contract + cache
  await generateContractBundle({
    repoRoot: testRepoRoot,
    buildCache: true
  });

  const cachePath = path.join(testRepoRoot, ".mcp-cache/pages");
  const cacheFiles = await fs.readdir(cachePath);
  const oldCache = JSON.parse(
    await fs.readFile(path.join(cachePath, cacheFiles[0]), "utf-8")
  );
  const oldHash = oldCache.contractSha256;

  // Modify repo (add a file, change detection)
  await fs.writeFile(
    path.join(testRepoRoot, "newfile.ts"),
    "// new test file"
  );

  // Regenerate contract WITHOUT rebuilding cache
  const result = await generateContractBundle({
    repoRoot: testRepoRoot,
    buildCache: false  // Cache not rebuilt
  });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  // Hash should be different (contract changed)
  expect(result.contractSha256).not.toBe(oldHash);

  // Old cache still has old hash (stale)
  const staleCache = JSON.parse(
    await fs.readFile(path.join(cachePath, cacheFiles[0]), "utf-8")
  );
  expect(staleCache.contractSha256).toBe(oldHash);
  expect(staleCache.contractSha256).not.toBe(result.contractSha256);

  // Phase 2 runtime would detect this mismatch and fail
});
```

---

## Migration Path: .mindtrace/contracts → .mcp-contract

### Canonical Output (Phase 1+)

**Write:** Always write to `.mcp-contract/` (canonical forward path)

**Read Priority:**
1. Check `.mcp-contract/` first (canonical)
2. If not found, fallback to `.mindtrace/contracts/` (legacy)
3. If legacy used, emit deterministic warning: `legacy_contract_dir_used=true`

### Legacy Compatibility

```typescript
function resolveContractDir(repoRoot: string): { dir: string; isLegacy: boolean } {
  const canonical = path.join(repoRoot, ".mcp-contract");
  const legacy = path.join(repoRoot, ".mindtrace/contracts");

  if (fs.existsSync(canonical)) {
    return { dir: canonical, isLegacy: false };
  }

  if (fs.existsSync(legacy)) {
    console.warn("⚠️  Using legacy contract directory: .mindtrace/contracts/ (migrate to .mcp-contract/)");
    return { dir: legacy, isLegacy: true };
  }

  // Neither exists - use canonical for creation
  return { dir: canonical, isLegacy: false };
}
```

### Write Behavior

**Default (Phase 1+):** Write to `.mcp-contract/` only

**Optional Legacy Dual-Write (transition flag):**
```bash
# Only if --write-legacy-contract-dir flag is explicitly set
mindtrace phase1 --write-legacy-contract-dir

# Effect: Writes to BOTH .mcp-contract/ and .mindtrace/contracts/
# Use case: Gradual migration for teams with automation expecting old path
```

**Implementation:**
```typescript
async function writeContractBundle(params: {
  contractDir: string;  // Canonical .mcp-contract/
  writeLegacy?: boolean;  // Optional dual-write
  // ...
}) {
  // Always write to canonical
  await writeFiles(params.contractDir, files);

  // Optionally mirror to legacy (explicit flag only)
  if (params.writeLegacy) {
    const legacyDir = params.contractDir.replace(".mcp-contract", ".mindtrace/contracts");
    await writeFiles(legacyDir, files);
  }
}
```

**Migration Policy:**
- ✅ Legacy fallback is **read-only by default**
- ✅ Write to legacy **only behind explicit flag** (prevents silent dual-output drift)
- ✅ Deterministic warning when legacy read occurs (observable in logs/CI)

---

## Acceptance Criteria

Phase 1 is "Done" when:

### 1. Determinism ✅

Running Phase 1 twice on unchanged repo produces:
- ✅ Identical `.mcp-contract/*.json` bytes
- ✅ Identical `contractSha256`
- ✅ Identical `.mcp-cache/pages/*.json` bytes (if `buildCache: true`)

### 2. Hash Linking ✅

- ✅ Every cache page includes `contractSha256` matching `.mcp-contract/contract.fingerprint.sha256`
- ✅ Cache files include `schemaVersion` and deterministic `pageId`
- ✅ Cache files include `generatedBy` (NO timestamps)

### 3. Drift Handling ✅

- ✅ If contract SHA changes, cache is considered invalid
- ✅ Phase 1 guarantees linkage exists (Phase 2 runtime enforces freshness)

### 4. Strict Validation ✅

- ✅ Contract bundle passes schema validation in strict mode
- ✅ Page cache passes schema validation in strict mode
- ✅ Unknown fields fail validation

### 5. Real Detection ✅

- ✅ `scanRepo()` replaces placeholder topology
- ✅ `detectFramework()` replaces hardcoded framework
- ✅ `inferStructure()` replaces hardcoded structure
- ✅ `detectLocatorStyle()` replaces hardcoded locator preferences
- ✅ `detectAssertionStyle()` replaces hardcoded assertion style

### 6. Contract Purity ✅

- ✅ `buildPageCache()` is contract-derived (no raw repo access)
- ✅ Fingerprint computed from canonical JSON only (no metadata)
- ✅ Cache builder signature forbids `RepoTopologyJSON` parameter

### 7. Backward Compatibility ✅

- ✅ Reads from `.mindtrace/contracts/` if `.mcp-contract/` doesn't exist
- ✅ Emits warning when legacy path is used
- ✅ Legacy write only behind explicit flag (no silent dual-output)

### 8. Enterprise Safety ✅

- ✅ `buildCache: false` by default (fast CI)
- ✅ `buildCache: true` opt-in (dev convenience)
- ✅ Strict mode enforces high-confidence detection

---

## Non-Goals (Out of Scope for Phase 1)

Phase 1 does NOT:

- ❌ **Implement runtime contract loading** - Deferred to Phase 2
- ❌ **Implement healing logic** - Deferred to Phase 3
- ❌ **Build cross-framework adapters** - Deferred to Phase 4
- ❌ **Implement learning loop** - Deferred to Phase 5
- ❌ **Execute tests** - Phase 1 generates contracts, doesn't run tests
- ❌ **Cache optimization** - No detection result caching (YAGNI for now)
- ❌ **Two-phase architecture** - No separate detect/generate tools (YAGNI)
- ❌ **Policy decisions** - Only detection and generation

---

## References

- **Phase 0 Design**: [docs/plans/2026-03-02-phase0-contract-generators-design.md](2026-03-02-phase0-contract-generators-design.md)
- **Phase 0 Implementation**: [docs/plans/2026-03-02-phase0-contract-generators-implementation.md](2026-03-02-phase0-contract-generators-implementation.md)
- **Phase 0 README**: [repo-intelligence-mcp/README.phase0.md](../../repo-intelligence-mcp/README.phase0.md)
- **Master Build Prompt**: [MindTrace_Master_Build_All_Phases_Deterministic_Automation_Contract_Architecture.md](../../MindTrace_Master_Build_All_Phases_Deterministic_Automation_Contract_Architecture.md)
- **Archived Legacy Document**: [ClaudeCode_Master_Build_All_Phases_MindTrace.md](../archive/ClaudeCode_Master_Build_All_Phases_MindTrace.md)

---

## Next Steps

After Phase 1 design approval:

1. **Create implementation plan** using `writing-plans` skill
2. **Execute implementation** using `subagent-driven-development` skill
3. **Update documentation** - README.phase1.md
4. **Phase 2**: Runtime contract loader (load contracts during test execution)
