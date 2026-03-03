# Phase 0 Contract Generators — Design Document

**Status**: Approved (Architecture Freeze)
**Date**: 2026-03-02
**Author**: MindTrace Team
**Version**: 1.0.0

---

## Executive Summary

This document defines the **canonical architecture** for Phase 0 contract generation in the MindTrace repo-intelligence-mcp system. It establishes generator boundaries, write authority, determinism rules, and the contract-first governance model that all future phases must respect.

**Core Principle**: Contract generation is **always recompute, never mutate, write-once per run**. The contract bundle is the **source of truth** for all downstream phases (cache building, runtime execution, healing, adaptation).

---

## 1. System Boundaries & Authority Model

### 1.1 Write Authority (WHO WRITES WHAT)

| Artifact Location         | Authority Writer                | Mutability         | Read By                  |
| ------------------------- | ------------------------------- | ------------------ | ------------------------ |
| `.mcp-contract/*`         | repo-intelligence-mcp (Phase 0) | WRITE-ONCE PER RUN | runtime, adapters, cache |
| `.mcp-cache/*`            | page-cache builder (Phase 1)    | CONTRACT-BOUND     | runtime, healing engine  |
| `runs/*/artifacts/*`      | runtime                         | RUN-LOCAL          | governance               |
| `runs/*/audit/*`          | runtime                         | APPEND-ONLY        | governance, enterprise   |
| `history/run-index.jsonl` | runtime learning loop (Phase 5) | APPEND-ONLY        | adapters, reporting      |

### 1.2 Strict Rules

- **repo-intelligence-mcp** OWNS `.mcp-contract/*`
- **Runtime** MUST NOT write to `.mcp-contract/*`
- **Cache builder** MUST NOT mutate contract
- **Governance** MUST NOT modify runtime artifacts
- **LLM/AI** MUST NOT write to contract/cache under any circumstance
- **Always recompute**: Never load existing contract and modify—always regenerate from topology

---

## 2. Phase 0 Contract Bundle (File Set)

### 2.1 FINGERPRINT_FILES (Canonical Order)

These 7 files are hashed to produce `automation-contract.hash`:

```
assertion-style.json
automation-contract.json
framework-pattern.json
page-key-policy.json
repo-topology.json
selector-strategy.json
wrapper-discovery.json
```

**Order**: Alphabetically sorted (deterministic).
**Hash excludes**: `contract.meta.json` (contains timestamp), `automation-contract.hash` (is the hash).

### 2.2 Complete Bundle (9 Files Total)

```
.mcp-contract/
  repo-topology.json           # Scan output
  framework-pattern.json        # Framework + style detection
  selector-strategy.json        # Locator strategy
  assertion-style.json          # Assertion style
  wrapper-discovery.json        # Custom wrappers
  automation-contract.json      # NEW: Master contract
  page-key-policy.json          # NEW: Page identity rules
  contract.meta.json            # NEW: Metadata (excluded from hash)
  automation-contract.hash      # NEW: SHA256 fingerprint (commit marker)
```

### 2.3 Hash as Commit Marker

**Critical Design Decision**: `automation-contract.hash` is written **last** (atomically). Its presence means:

- All 7 FINGERPRINT_FILES exist
- All files passed validation
- Bundle is complete and valid

If hash is missing or stale → bundle is incomplete/invalid.

---

## 3. Generator Architecture

### 3.1 Design Pattern: Modular Pure Generators + Single Write Authority

**Pattern**: Separate **compute** (pure generators) from **write** (bundle writer).

```
┌─────────────────────────────────────────────────┐
│  generateContractBundle (Coordinator)           │
│                                                  │
│  1. Scan + Detect (pure compute)                │
│  2. Generate all contracts (pure compute)       │
│  3. Write bundle atomically (write layer)       │
│  4. Validate (read-only)                        │
│  5. Fingerprint + write hash (commit)           │
└─────────────────────────────────────────────────┘
```

### 3.2 Generator Responsibilities

#### Pure Generators (NEVER throw, NEVER write)

| Generator                      | Input                       | Output                | Side Effects |
| ------------------------------ | --------------------------- | --------------------- | ------------ |
| `generateAutomationContract()` | topology, detections        | AutomationContract    | NONE         |
| `generatePageKeyPolicy()`      | topology, stylesDetected    | PageKeyPolicy         | NONE         |
| `generateContractMeta()`       | topology, contractInputs    | ContractMeta          | NONE         |
| `buildPaths()`                 | topology, framework, styles | paths object          | NONE         |
| `detectPrimaryStyle()`         | stylesDetected              | primaryStyle (string) | NONE         |

**Pure generators return**: `{ ok: true, data: T }` or `{ ok: false, error: string }`

#### Write Layer (CAN throw on I/O failure)

| Function                        | Responsibility                      | Atomicity         |
| ------------------------------- | ----------------------------------- | ----------------- |
| `writeContractBundle()`         | Write 3 new files to temp → final   | Atomic-ish        |
| `writeFingerprintAtomic()`      | Write hash with temp → rename       | Atomic (OS-level) |
| `computeContractFingerprint()`  | Read + hash files (read-only)       | N/A               |
| `validateContractBundle()`      | Read + validate schemas (read-only) | N/A               |
| `retrofitEvidenceBundle()`      | Read + merge evidence + write back  | Non-atomic        |

---

## 4. Tool Pipeline (generateContractBundle)

### 4.1 Complete Phase 0 Pipeline

```typescript
export async function generateContractBundle(input: {
  repoRoot: string;
  mode?: "strict" | "best_effort";
}): Promise<GenerateContractBundleResult>
```

**Pipeline Steps** (order is critical):

1. **Scan**: `scanRepo(repoRoot)` → topology
2. **Detect**: framework, structure, locator, assertion, wrappers
3. **Derive**: stylesDetected, primaryStyle, entrypoints
4. **Write base artifacts**: Write all 7 FINGERPRINT_FILES (repo-topology, framework-pattern, selector-strategy, assertion-style, wrapper-discovery, automation-contract, page-key-policy)
5. **Retrofit evidence**: Merge evidence into framework/selector/assertion (read → merge → write)
6. **Generate new contracts**: automation-contract, page-key-policy, contract.meta
7. **Write new contracts**: Write 3 new files via `writeContractBundle()`
8. **Validate**: `validateContractBundle()` (read-only, schema validation)
9. **Fingerprint**: `computeContractFingerprint()` over 7 files
10. **Write hash**: `writeFingerprintAtomic()` (commit marker, last write)

### 4.2 Why This Order Matters

- **Write ALL base artifacts first** → ensures strict mode works on fresh repos
- **Retrofit before new contracts** → ensures evidence is complete
- **Validate before hash** → hash only written if bundle is valid
- **Hash last** → presence of hash = bundle complete & valid

---

## 5. Evidence Retrofit Model

### 5.1 Retrofit API (Canonical)

```typescript
retrofitEvidenceBundle(
  contracts: {
    framework: FrameworkPatternJSON;
    selector: SelectorStrategyJSON;
    assertion: AssertionStyleJSON;
  },
  topology: RepoTopologyJSON
): {
  framework: FrameworkPatternJSON;
  selector: SelectorStrategyJSON;
  assertion: AssertionStyleJSON;
}
```

### 5.2 Merge Rules (NEVER overwrite)

Evidence retrofit **MERGES**, never overwrites:

1. **Upgrade empty-file entries**: If existing evidence has `file: ""` and new has `file: "real/path.ts"`, upgrade
2. **Add new evidence**: If new evidence not present, add
3. **Preserve existing**: Never remove or modify existing valid evidence

**Deterministic**: Evidence arrays maintain insertion order, merge is idempotent.

---

## 6. Atomic Write Contract

### 6.1 writeContractBundle() Atomicity

```typescript
writeContractBundle(params: {
  contractDir: string;
  automationContract: AutomationContract;
  pageKeyPolicy: PageKeyPolicy;
  contractMeta: ContractMeta;
}): Promise<void>
```

**Atomic-ish Write Strategy**:

1. Create temp dir: `.mcp-contract/.tmp/<uuid>`
2. Write all 3 files to temp dir (canonical JSON)
3. Copy to final destination in **sorted order** (alphabetical)
4. Cleanup temp dir
5. **Do NOT write hash** (coordinator does this after validation)

**Why sorted order?** → Deterministic write order reduces partial-write surface.

### 6.2 Fingerprint Atomic Write

```typescript
writeFingerprintAtomic(contractDir: string, fingerprint: string): void
```

**Atomic Write Strategy**:

1. Write to temp file: `automation-contract.hash.tmp.<uuid>`
2. Delete stale hash if exists
3. Rename temp → final (**OS-level atomic rename**)

**Result**: Hash file either exists (valid) or doesn't (invalid). No partial state.

---

## 7. Fingerprint Lifecycle

### 7.1 Computation (Read-Only)

```typescript
computeContractFingerprint(
  contractDir: string,
  mode: "strict" | "best_effort"
): { ok: true; fingerprint: string; files: string[] } | { ok: false; error: string }
```

**Algorithm**:

1. Load FINGERPRINT_FILES constant (canonical order)
2. Check which files exist
3. If `mode: "strict"` and any missing → `{ ok: false }`
4. If `mode: "best_effort"` and none exist → `{ ok: false }`
5. Sort available files alphabetically
6. For each file:
   - Hash filename: `hasher.update(toPosix(filename) + "\n")`
   - Hash content: `hasher.update(canonicalStringify(parsed) + "\n")`
7. Return SHA256 hex digest

**Why hash filename?** → Prevents ambiguity if two files swap content.

### 7.2 Validation (Read-Only)

```typescript
validateContractBundle(contractDir: string): ValidationResult
```

**Validation Steps**:

1. Check all required files exist (7 FINGERPRINT_FILES + contract.meta.json)
2. Validate each file against JSON schema
3. Compute fingerprint (read-only)
4. Compare computed fingerprint vs stored hash
5. Return `{ valid: boolean; errors: string[]; warnings: string[] }`

**Critical**: Validation NEVER writes files. It's purely read-only.

---

## 8. Strict Mode vs Best-Effort

### 8.1 Strict Mode

**Use Case**: CI/CD, governance enforcement, contract integrity checks.

**Behavior**:

- Requires ALL 7 FINGERPRINT_FILES to exist
- Fails fast if any file missing
- Fails if hash mismatch
- Fails if schema validation fails

**Exit Code**: Non-zero on any failure.

### 8.2 Best-Effort Mode

**Use Case**: Local development, exploration, partial repo analysis.

**Behavior**:

- Computes fingerprint over available files (min 1)
- Warns about missing files
- Continues execution
- Writes warnings to `contract.meta.json`

**Exit Code**: Zero unless catastrophic failure.

### 8.3 Governance Control

Governance MCP decides which mode to enforce based on policy. Repo-intelligence-mcp supports both but does NOT enforce policy.

---

## 9. Cache Invalidation Trigger Model

### 9.1 Cache Validity Rule

```
.mcp-cache/meta.json.contract_hash == .mcp-contract/automation-contract.hash
```

**If mismatch**:

- Cache is INVALID
- Phase 1 cache builder must regenerate
- Runtime continues (non-fatal initially, governance may escalate)

### 9.2 Rebuild Triggers

Cache MUST be rebuilt when:

- `automation-contract.hash` changes
- `schema_version` major bump
- Framework or style detection changes
- Selector strategy changes
- Assertion style changes

**Detection**: Compare stored hash vs computed hash.

---

## 10. Determinism Rules

### 10.1 Canonical JSON Stringify

```typescript
canonicalStringify(obj: any): string
```

**Rules**:

1. **Deep recursive key sorting** at ALL depths (not just top-level)
2. Objects: sort keys alphabetically (`localeCompare`)
3. Arrays: preserve order (do NOT sort)
4. Null/primitives: as-is
5. Pretty-print: 2-space indent
6. Trailing newline: MUST include

### 10.2 POSIX Path Normalization

```typescript
toPosix(path: string): string
```

**Rules**:

1. Convert backslashes → forward slashes
2. Strip leading `./`
3. Normalize `//` → `/`
4. Repo-relative (never absolute)

**Used everywhere**: file paths, evidence.file, detectedPaths, entrypoints, examples.

### 10.3 Deterministic Ordering

**All arrays that affect fingerprint MUST be deterministically ordered**:

- `stylesDetected`: alphabetically sorted
- `entrypoints`: sorted by style, then entrypoint
- `patterns` keys: alphabetically sorted (object key order)
- `evidence`: insertion order (deterministic via merge rules)
- `contractInputs`: alphabetically sorted
- Config arrays (`configs.playwright`, etc.): deduped + sorted

---

## 11. Schema Versioning & Compatibility

### 11.1 Dual Versioning (Transition Period)

**All contracts include**:

```json
{
  "schema_version": "0.1.0",
  "contractVersion": "0.1.0"
}
```

- `schema_version`: New standard (forward-looking)
- `contractVersion`: Legacy compatibility (Phase 0 transition)

**Future**: Remove `contractVersion` after Phase 1+ adoption.

### 11.2 Breaking Changes (MAJOR)

- Run layout changes
- Required artifact name changes
- Exit code semantics changes
- Contract key structure changes

### 11.3 Non-Breaking Changes (MINOR)

- Additional optional fields
- New evidence categories
- New adapter capabilities

---

## 12. Type System Architecture

### 12.1 Type Hierarchy

```typescript
// Framework-level types
type Framework = "cypress" | "playwright" | "selenium" | "unknown";

// Architecture vs Style Key (critical split)
type Architecture = "native" | "pom" | "bdd" | "hybrid" | "unknown";
type StyleKey = `style${number}-${string}` | "unknown";

// Evidence
type EvidenceKind = "config" | "dependency" | "wrapper" | "pattern" | "entrypoint" | "structure";
type Evidence = {
  kind: EvidenceKind;
  file: string;  // POSIX, repo-relative, may be "" during retrofit
  sample?: string;
};

// Entrypoints
type Entrypoint = {
  style: string;
  entrypoint: string;
  confidence?: number;
};
```

### 12.2 Contract Types

**AutomationContract**: Master contract linking all Phase 0 artifacts
**PageKeyPolicy**: Page identity rules (hybrid mode: hardcoded + detected)
**ContractMeta**: Metadata + warnings (excluded from hash)

---

## 13. Primary Style Detection

### 13.1 Semantic Priority Rule

**Rule**: Highest architectural complexity wins.

```typescript
STYLE_PRIORITY = {
  "style3-pom-bdd": 3,
  "style2-bdd": 2,
  "style1-native": 1,
  "unknown": 0
}
```

**Algorithm**:

1. Sort stylesDetected by priority (descending)
2. Ties broken alphabetically
3. Return first (highest priority)

**Deterministic**: Yes (stable priority + alphabetical tiebreak).

---

## 14. Paths Architecture

### 14.1 paths Object Structure

```json
{
  "root": ".",
  "contractDir": ".mcp-contract",
  "cacheDir": ".mcp-cache",
  "runsDir": "runs",
  "entrypoints": {
    "style1-native": ["tests"],
    "style2-bdd": ["features"],
    "style3-pom-bdd": ["tests"]
  },
  "pages": ["src/pages", "pages", "tests/pages"],
  "steps": ["features/step_definitions", "features/steps"],
  "wrappers": ["src/support", "support"],
  "configs": {
    "playwright": ["playwright.config.ts"],
    "cypress": ["cypress.config.ts"],
    "selenium": []
  }
}
```

### 14.2 Population Rules

1. **Prefer detected** paths from topology signals
2. **Fallback to defaults** if not detected
3. **Normalize** all paths (POSIX, dedupe, sort)
4. **Style-aware entrypoints**: Map each detected style to its test directories

---

## 15. Page Key Policy (Hybrid Mode)

### 15.1 Pattern Confidence Constants

```typescript
CONFIDENCE = {
  HARDCODED: 0.95,  // Known patterns (style1-3)
  DETECTED: 0.70,   // Inferred patterns
  FALLBACK: 0.50    // Unknown/guess
}
```

### 15.2 Pattern Structure (Rich Object)

```json
{
  "patterns": {
    "style1-native": {
      "template": "<FileName>",
      "confidence": 0.95,
      "source": "hardcoded"
    },
    "style2-bdd": {
      "template": "<ScenarioName>",
      "confidence": 0.95,
      "source": "hardcoded"
    },
    "style3-pom-bdd": {
      "template": "<PageClassName>",
      "confidence": 0.95,
      "source": "hardcoded"
    }
  }
}
```

### 15.3 Collision Resolution

**Rule**: `"deterministic_suffix"` — append numeric suffix on collision.

**Example**: `LoginPage`, `LoginPage_2`, `LoginPage_3`

---

## 16. MCP Server Integration

### 16.1 Tool Surface

**Single MCP Tool**: `generate_contract_bundle`

```json
{
  "name": "generate_contract_bundle",
  "description": "Generate complete Phase 0 contract bundle",
  "inputSchema": {
    "type": "object",
    "required": ["repoRoot"],
    "properties": {
      "repoRoot": { "type": "string" },
      "mode": { "type": "string", "enum": ["strict", "best_effort"] }
    }
  }
}
```

### 16.2 Handler Registration (MCP SDK)

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...] }));
server.setRequestHandler(CallToolRequestSchema, async (request) => { ... });
```

**ESM-safe**: Uses `fileURLToPath(import.meta.url)` for `__dirname`.

---

## 17. Validation Implementation

### 17.1 Schema Loading (AJV)

**Load order** (critical):

1. `shared/evidence.schema.json` (loaded first, referenced by others)
2. All contract schemas (automation-contract, page-key-policy, contract-meta)
3. All existing schemas (framework-pattern, selector-strategy, etc.)

**Validation**: `validateAgainstSchema(filename, data)` → `{ valid, errors }`

### 17.2 Schema References

```json
{
  "evidence": {
    "type": "array",
    "items": { "$ref": "mindtrace://schemas/shared/evidence.schema.json" }
  }
}
```

**$id stability**: Never change evidence schema $id (contracts reference it).

---

## 18. Failure Semantics

### 18.1 Generator Failures (Pure Functions)

**Never throw** → return `{ ok: false, error: string }`

**Coordinator handles**:

- Log error
- Decide: fail-fast vs continue with warnings
- Propagate to governance

### 18.2 Write Layer Failures (I/O)

**Can throw** on unrecoverable I/O:

- Permission denied
- Disk full
- Filesystem corruption

**Coordinator catches**:

- Cleanup temp files
- Return error result
- Do NOT leave partial bundle

### 18.3 Validation Failures

**Read-only** → return `{ valid: false, errors: [] }`

**Coordinator decides**:

- Strict mode: fail immediately
- Best-effort: log warnings, continue

---

## 19. Phase 0 Contract Ownership Boundaries

### 19.1 What Phase 0 OWNS

- `.mcp-contract/` directory and all contents
- Contract generation logic (repo-intelligence-mcp)
- Schema definitions
- Fingerprint computation
- Evidence model

### 19.2 What Phase 0 DOES NOT OWN

- `.mcp-cache/` (Phase 1 owns)
- `runs/` (Runtime owns)
- `history/` (Runtime + learning loop owns)
- Test execution (Runtime owns)
- Healing decisions (Healing engine owns, Phase 3)
- Policy enforcement (Governance owns)

### 19.3 Contract Authority Transfer

Phase 0 writes contract **once per run** → downstream phases **read only**.

**No feedback loop** from runtime to contract (contract is immutable after generation).

**Learning loop** (Phase 5) updates confidence scores in `history/`, NOT in contract.

---

## 20. Testing Strategy

### 20.1 Unit Tests (Pure Generators)

- All input edge cases
- Evidence retrofit merge logic
- Canonical stringify with deep nesting
- Page key collision resolution
- Primary style detection with all priority permutations
- POSIX normalization edge cases

### 20.2 Integration Tests

- Full Phase 0 run on known repos (snapshot tests)
- Contract bundle write → validate → fingerprint round-trip
- Schema validation for all contract files
- Stale file cleanup verification
- Atomic hash write verification

### 20.3 Snapshot Tests

**Determinism validation**:

- Given fixed topology → produce byte-identical contract bundle
- SHA256 fingerprint MUST match across runs
- Canonical JSON output byte-for-byte identical
- Hash includes filename verification (swap test)

---

## 21. Design Freeze Checklist

This design is **frozen** when:

- [x] Generator boundaries defined (pure vs write layer)
- [x] Write authority model documented
- [x] Atomic write contract specified
- [x] Fingerprint lifecycle defined
- [x] Strict vs best-effort modes specified
- [x] Evidence retrofit rules defined
- [x] Determinism rules documented
- [x] Schema versioning strategy defined
- [x] Type system architecture defined
- [x] MCP tool surface defined
- [x] Validation implementation specified
- [x] Cache invalidation trigger model defined
- [x] Phase 0 ownership boundaries defined
- [x] Testing strategy defined

---

## 22. Acceptance Criteria

Phase 0 contract generation is **complete** when:

1. ✅ `generate_contract_bundle` tool produces deterministic output
2. ✅ All 9 files written (7 FINGERPRINT_FILES + meta + hash)
3. ✅ Hash is atomic commit marker (last write)
4. ✅ Validation passes on generated bundle
5. ✅ Strict mode works on fresh repos
6. ✅ Evidence retrofit merges (never overwrites)
7. ✅ Schemas validate all generated contracts
8. ✅ Fingerprint stable across runs (same inputs)
9. ✅ POSIX paths everywhere
10. ✅ Canonical JSON everywhere
11. ✅ No regression in existing Phase 0 tools
12. ✅ MCP server exposes tool correctly

---

## 23. Non-Goals (Out of Scope for Phase 0)

**Phase 0 does NOT**:

- Build page cache (Phase 1)
- Load contracts into runtime (Phase 2)
- Implement healing logic (Phase 3)
- Build cross-framework adapters (Phase 4)
- Implement learning loop (Phase 5)
- Build enterprise UI/dashboard (Phase 6)
- Execute tests
- Make policy decisions
- Interact with LLM/AI for generation

**Contract generation is purely deterministic**, based on repo topology signals.

---

## 24. Future Hardening (Post-Approval)

**Non-blocking improvements** for future iterations:

1. **Type safety**: `detectPrimaryStyle()` return `StyleKey` instead of `string`
2. **FINGERPRINT_FILES ordering**: Guard against accidental re-sorting (lint rule)
3. **Evidence kind validation**: Runtime check that all evidence.kind values are in enum
4. **Schema drift detection**: CI test that TS types match JSON schemas
5. **Fingerprint version**: Add `hash_version: "sha256-v1"` for future hash algorithm changes

---

## 25. References

- [Master Build Document](../../MindTrace_Master_Build_All_Phases_Deterministic_Automation_Contract_Architecture.md)
- [Policy & Boundaries Spec](../../MindTrace_Master_Build_All_Phases_Deterministic_Automation_Contract_Architecture.md#policy--boundaries-spec)
- [Archived legacy document](../archive/ClaudeCode_Master_Build_All_Phases_MindTrace.md)
- [Existing Phase 0 Schemas](../../repo-intelligence-mcp/src/schemas/)
- [Existing Phase 0 Types](../../repo-intelligence-mcp/src/types/contract.ts)

---

**END OF DESIGN DOCUMENT**

This design is now the **canonical architecture** for Phase 0 contract generation. All implementation work MUST align with this specification. Any deviations require architecture review and design doc update.
