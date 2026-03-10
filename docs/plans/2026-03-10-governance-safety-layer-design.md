# Governance Safety Layer (GSL) - Design

**Date:** 2026-03-10
**Status:** Approved
**Implementation Order:** C → A → B (GSL → Skills → ACIN)

---

## Overview

The Governance Safety Layer (GSL) establishes defense-in-depth protection to ensure AI outputs never become live execution authority in MindTrace.

**Core Principle:**

> AI outputs must never be consumed as live execution authority.

All AI outputs must be serialized as advisory artifacts only and may only influence future execution through explicit human-approved, schema-validated regeneration flows.

---

## Problem Statement

**The Subtle Mistake:** Most AI testing platforms let AI output become untyped, implicit runtime input, which destroys determinism.

**Common Failure Patterns:**
```typescript
// ❌ Dangerous: AI becomes hidden authority
if (aiSuggestion.confidence > 0.8) {
  useSuggestion(aiSuggestion)
}

// ❌ Dangerous: Advisory mixed with authoritative
candidateList = deterministicCandidates.concat(aiCandidates)

// ❌ Dangerous: AI recommendation becomes execution input
if (aiRca.recommendedSelector) {
  retryWith(aiRca.recommendedSelector)
}
```

**Impact:** Once this happens, the system is no longer:
- Contract-first
- Deterministic
- Governance-controlled

It becomes just another AI-healing framework.

---

## Design Decisions

### Implementation Strategy

**Chosen:** Incremental Layering (4 layers in sequence)

**Layers:**
1. Schema Validation Gates (foundation)
2. Audit Trail Enforcement (visibility)
3. File System Guards (hard boundaries)
4. Runtime Type Guards (compile-time safety)

**Rationale:**
- Lower risk - each layer tested independently
- Faster to first value - schema validation provides immediate safety
- Easier to debug - clear boundaries between layers
- Verifiable safety over speed
- Each layer builds on previous guarantees

**Rejected Alternatives:**
- Atomic GSL Module - too risky for governance-critical changes
- Parallel Streams - creates merge-point risk in authority boundaries

---

## Layer 1: Schema Validation Gates

**Purpose:** Establish formal authority separation through schemas before any enforcement

### Architecture

**Schema Categories:**

```
schemas/
├── authoritative/          # May influence execution
│   ├── policy-decision.schema.json
│   ├── runtime-contract-context.schema.json
│   ├── healing-attempts.schema.json
│   ├── healing-outcome.schema.json
│   ├── healing-summary.schema.json
│   └── contract-awareness.schema.json
│
└── advisory/              # Analysis only, never execution
    ├── rca-report.schema.json
    ├── selector-suggestion.schema.json
    ├── flaky-pattern-analysis.schema.json
    ├── contract-drift-explanation.schema.json
    ├── contract-evolution-proposal.schema.json
    └── ui-change-prediction.schema.json
```

### Validation Points

- **Before Write:** All artifacts must pass schema validation before disk write
- **After Read (Advisory):** Advisory artifacts validated on read for integrity
- **Reject Invalid:** Malformed artifacts rejected with clear error messages

### Implementation

```typescript
interface SchemaValidator {
  validateAuthoritative(artifact: unknown, schemaName: string): ValidationResult;
  validateAdvisory(artifact: unknown, schemaName: string): ValidationResult;
  rejectInvalid(artifact: unknown): never;
}

type ValidationResult =
  | { valid: true; artifact: AuthoritativeArtifact }
  | { valid: false; errors: SchemaError[] };
```

**Location:** `shared-packages/schema-validator/`

### Key Constraints

1. **Additive Only:** Validate current artifact formats first, evolve forward
2. **JSONL Per-Entry Validation:** Streams validated line-by-line, not as single document
3. **Strict Separation:** Authoritative vs advisory must be explicit
4. **Validation Before Write:** Reject with clear deterministic errors
5. **Pure Validation Logic:** No runtime decision logic in validator
6. **Exit Code Semantics:** Schema failures map to exit code 3 (policy/compliance violation)
7. **Schema Versioning:** Support `schemaVersion` field for evolution

### Guarantees

✅ No artifact exists without passing schema validation
✅ Clear contract for authoritative vs advisory classification
✅ Foundation for all subsequent layers

---

## Layer 2: Audit Trail Enforcement

**Purpose:** Establish provable separation between runtime/governance artifacts and advisory/AI artifacts

### Architecture

**Directory Separation:**

```
runs/<runId>/artifacts/
├── runtime/              # Authoritative (influences execution)
│   ├── policy-decision.json
│   ├── runtime-contract-context.json
│   ├── healing-attempts.jsonl
│   ├── healing-outcome.json
│   └── healing-summary.json
│
└── advisory/             # Advisory only (analysis, never execution)
    ├── rca-report.json
    ├── selector-suggestions.json
    ├── flaky-pattern-analysis.json
    ├── contract-drift-explanation.json
    ├── contract-evolution-proposals.json
    └── ui-change-prediction.json
```

### Enforcement Rules

1. **Write Path Separation**
   - Runtime/governance writes to `artifacts/runtime/`
   - Claude Skills write to `artifacts/advisory/`
   - No cross-directory writes

2. **Immutable Audit Trail**
   - Append-only: healing-attempts.jsonl, run-index.jsonl
   - Create-once or replace-deterministically-before-finalization: snapshot artifacts
   - No post-finalization mutation
   - Full history preserved

3. **Authority Boundary**
   - Runtime may read `runtime/` for execution
   - Runtime must NEVER consume `advisory/` as execution input
   - Advisory artifacts are analysis-only

### Audit Guarantees

After every run, provable:
- ✅ What deterministic runtime produced (`artifacts/runtime/`)
- ✅ What governance decided (`policy-decision.json`)
- ✅ What AI suggested (`artifacts/advisory/`)
- ✅ That AI did not influence execution (directory separation)

### Implementation

```typescript
// Separate writers by ownership
interface RuntimeArtifactWriter {
  writeRuntimeArtifact(artifact: AuthoritativeArtifact, filename: string): void;
  appendRuntimeStream(entry: StreamEntry, streamName: string): void;
}

interface AdvisoryArtifactWriter {
  writeAdvisoryArtifact(artifact: AdvisoryArtifact, filename: string): void;
}

// Path constants
const RUNTIME_PATH = 'runs/{runId}/artifacts/runtime/';
const ADVISORY_PATH = 'runs/{runId}/artifacts/advisory/';
```

### Key Constraints

1. **Additive Only:** No silent migration of historical runs
2. **Read-Time Enforcement:** Prevent advisory consumption as execution input
3. **Append-Only vs Snapshot:** Distinguish streams from per-run snapshots
4. **Compatibility Mapping:** Formal mapping for legacy flat artifact layout
5. **Artifact Metadata:** Include `artifactClass: "advisory" | "authoritative"`
6. **Precise Violations:** "Advisory consumed as authoritative execution input" = exit code 3
7. **Ownership Boundaries:** Separate RuntimeArtifactWriter vs AdvisoryArtifactWriter
8. **Legacy Support:** Historical runs remain readable in flat layout

### Error Handling

- Advisory-as-authority consumption → **exit code 3**
- Invalid runtime artifact placement → **exit code 3**
- Unauthorized write path → **exit code 3**
- Post-finalization mutation → **exit code 3**

---

## Layer 3: File System Guards

**Purpose:** Enforce hard write-path boundaries so runtime/AI can never mutate contracts or cache

### Protected Directories

```
.mcp-contract/          # Only Phase 0 generators may write
.mcp-cache/             # Only Phase 1 cache builders may write
```

### Write Authority Registry

```typescript
interface WriteAuthorityRegistry {
  canWriteToContracts(callerId: WriterIdentity): boolean;
  canWriteToCache(callerId: WriterIdentity): boolean;
}

// Minimal authority model
const AUTHORIZED_CONTRACT_WRITERS = [
  'repo-intelligence-mcp:contract-bundle-writer'
];

const AUTHORIZED_CACHE_WRITERS = [
  'repo-intelligence-mcp:page-cache-writer'
];

// Never authorized
const FORBIDDEN_WRITERS = [
  'mindtrace-ai-runtime:*',
  'healing-engine:*',
  'claude-skills:*',
  'advisory-layer:*'
];
```

### Enforcement Points

1. **Centralized Write API**
   - All protected writes through guarded writer abstraction
   - Direct writes to protected directories = policy violation
   - Pre-write validation with caller identity check

2. **Integrity Validation on Startup**
   - Verify contract/cache integrity before run
   - Detect unauthorized modifications (fingerprint mismatch)
   - Fail-safe: abort run if tampering detected

3. **Violation Logging**
   - Every blocked write logged to audit trail
   - Structured violation artifacts include: caller, path, authority class, violation code

### Implementation

```typescript
class FileSystemGuard {
  private registry: WriteAuthorityRegistry;

  guardContractWrite(callerId: WriterIdentity, filePath: string): void {
    if (filePath.startsWith('.mcp-contract/')) {
      if (!this.registry.canWriteToContracts(callerId)) {
        throw new GovernanceViolation(
          'UNAUTHORIZED_CONTRACT_WRITE',
          `Caller ${callerId} forbidden from writing to .mcp-contract/`,
          { exitCode: 3 }
        );
      }
    }
  }

  guardCacheWrite(callerId: WriterIdentity, filePath: string): void {
    if (filePath.startsWith('.mcp-cache/')) {
      if (!this.registry.canWriteToCache(callerId)) {
        throw new GovernanceViolation(
          'UNAUTHORIZED_CACHE_WRITE',
          `Caller ${callerId} forbidden from writing to .mcp-cache/`,
          { exitCode: 3 }
        );
      }
    }
  }
}
```

### Key Constraints

1. **Guard Write API Boundary:** Centralized enforcement, not scattered path checks
2. **Deterministic Caller Identity:** Capability tokens, not free strings
3. **Minimal Authority:** Only final bundle/cache writers authorized
4. **Defense-in-Depth:** OS read-only mode secondary, not primary security
5. **Integrity Validation:** Respect existing contract/cache rules
6. **Violation Classification:** Distinguish startup integrity failures from live mutations
7. **Mandatory Audit Logging:** Every blocked write logged
8. **Backward Compatible:** Legacy `.mindtrace/contracts/` readable, canonical writable
9. **Narrowly Scoped:** Only `.mcp-contract/` and `.mcp-cache/`

### Violation Codes

- `UNAUTHORIZED_CONTRACT_WRITE` → exit code 3
- `UNAUTHORIZED_CACHE_WRITE` → exit code 3
- `CONTRACT_INTEGRITY_FAILURE` → exit code 3
- `CACHE_INTEGRITY_FAILURE` → exit code 3

### Guarantees

✅ Runtime cannot mutate `.mcp-contract/`
✅ Runtime cannot mutate `.mcp-cache/`
✅ Claude Skills cannot mutate `.mcp-contract/`
✅ Claude Skills cannot mutate `.mcp-cache/`
✅ Only authorized generators can write protected directories
✅ Tampering detected at startup

---

## Layer 4: Runtime Type Guards

**Purpose:** Prevent advisory AI outputs from accidentally flowing into execution logic through compile-time type safety

### Branded Type System

```typescript
// Authority markers (nominal types)
declare const AuthorityBrand: unique symbol;
declare const AdvisoryBrand: unique symbol;

// Authoritative execution inputs
type ExecutionAuthorityInput<T> = T & { [AuthorityBrand]: true };

// Advisory outputs (analysis only)
type AdvisoryArtifact<T> = T & { [AdvisoryBrand]: true };

// Restricted to trusted loaders only
function asAuthoritative<T>(data: T): ExecutionAuthorityInput<T> {
  return data as ExecutionAuthorityInput<T>;
}

function asAdvisory<T>(data: T): AdvisoryArtifact<T> {
  return data as AdvisoryArtifact<T>;
}
```

### Execution Boundary Enforcement

```typescript
// Runtime APIs accept only authoritative inputs
class HealingOrchestrator {
  healWithCandidate(
    candidate: ExecutionAuthorityInput<Candidate>
  ): HealResult {
    // ✅ Type-safe execution
  }
}

// Advisory APIs produce only advisory outputs
class FailureRCAGenerator {
  generateRCA(
    healingAttempts: ExecutionAuthorityInput<AttemptRecord[]>
  ): AdvisoryArtifact<RCAReport> {
    // ✅ Reads authoritative, produces advisory
  }
}
```

### Prevented Failure Modes

```typescript
// ❌ Prevented at compile time
function dangerousPattern(
  aiSuggestion: AdvisoryArtifact<SelectorSuggestion>
) {
  useSuggestion(aiSuggestion); // Type error
}

// ❌ Prevented: mixing advisory with authoritative
candidateList = [
  ...contractCandidates,
  ...aiCandidates  // Type error
];
```

### Safe Escape Hatch

```typescript
// Advisory must flow through regeneration, never direct consumption
async function humanApprovedContractUpdate(
  proposal: AdvisoryArtifact<ContractEvolutionProposal>,
  humanApproval: HumanApprovalToken
): Promise<void> {
  if (!humanApproval.verified) {
    throw new Error('Human approval required');
  }

  // Regenerate contract (not direct consumption)
  await regenerateContract({
    incorporateProposal: proposal,
    humanApproved: true
  });
}
```

### Key Constraints

1. **Reinforcement Layer:** Types supplement runtime enforcement, not replace it
2. **Trusted Loaders Only:** Authority-minting restricted to validated sources
3. **Forbid Unsafe Casts:** Lint rule blocks direct casts outside trusted modules
4. **Domain-Specific Types:** Critical APIs use strongly named authoritative types
5. **Structural vs Semantic:** Types prevent structural misuse, not every semantic misuse
6. **Module Boundaries:** Execution packages cannot depend on advisory packages
7. **Regeneration Required:** Approved outputs flow through regeneration only
8. **Authority Validation:** Validate by schema + metadata + directory, not path alone
9. **Gradual Migration:** Existing code still compiles, branding added incrementally

### Guarantees

✅ Advisory artifacts cannot be passed to execution APIs (compile-time)
✅ AI suggestions cannot become selectors without explicit regeneration
✅ Type system enforces authority boundaries
✅ Escape hatches require explicit human approval
✅ Advisory artifacts cannot be consumed as authoritative execution inputs

---

## Implementation Checklist

**Layer 1: Schema Validation Gates**
- [ ] Create `schemas/authoritative/` directory
- [ ] Create `schemas/advisory/` directory
- [ ] Define authoritative schemas for existing artifacts
- [ ] Define advisory schemas for Claude Skills outputs
- [ ] Implement `SchemaValidator` in `shared-packages/schema-validator/`
- [ ] Add per-entry validation for JSONL streams
- [ ] Add `schemaVersion` support
- [ ] Map schema failures to exit code 3
- [ ] Test with existing artifact formats
- [ ] Commit

**Layer 2: Audit Trail Enforcement**
- [ ] Create `artifacts/runtime/` directory structure
- [ ] Create `artifacts/advisory/` directory structure
- [ ] Implement `RuntimeArtifactWriter`
- [ ] Implement `AdvisoryArtifactWriter`
- [ ] Add `artifactClass` metadata to artifacts
- [ ] Create compatibility loader for legacy flat layout
- [ ] Add read-time enforcement for advisory consumption
- [ ] Distinguish append-only streams from snapshots
- [ ] Test backward compatibility with historical runs
- [ ] Commit

**Layer 3: File System Guards**
- [ ] Create `WriteAuthorityRegistry`
- [ ] Implement `FileSystemGuard`
- [ ] Define minimal authorized writer identities
- [ ] Add centralized guarded write APIs
- [ ] Add startup integrity validation
- [ ] Add violation logging with structured codes
- [ ] Test unauthorized write attempts
- [ ] Test tampering detection
- [ ] Verify legacy path compatibility
- [ ] Commit

**Layer 4: Runtime Type Guards**
- [ ] Define branded type system
- [ ] Restrict authority-minting to trusted loaders
- [ ] Update execution APIs to require authoritative types
- [ ] Update advisory APIs to return advisory types
- [ ] Add lint rules for unsafe casts
- [ ] Add module boundary enforcement
- [ ] Document escape hatch patterns
- [ ] Gradual migration of existing code
- [ ] Test compile-time error prevention
- [ ] Commit

---

## Success Criteria

✅ All four layers implemented in sequence
✅ Each layer tested independently before next layer
✅ No breaking changes to existing runtime behavior
✅ Backward compatibility with historical runs
✅ Clear audit trail separating authoritative from advisory
✅ Compile-time prevention of advisory-as-authority misuse
✅ All violations map to appropriate exit codes
✅ Comprehensive test coverage for each layer

---

## What We're NOT Doing

❌ Big-bang GSL module
❌ Parallel stream implementation
❌ Silent migration of historical runs
❌ Renaming existing artifacts
❌ Breaking backward compatibility
❌ Relying on types alone for security

---

## Future Work (After GSL Complete)

- Layer 5: Claude Skills implementation (9 assistive skills)
- Layer 6: ACIN (Automation Contract Intelligence Network)
- Enhanced monitoring/dashboards for GSL violations
- Extended lint rules for semantic misuse detection

---

## Related Documentation

- [Master Architecture](../../MindTrace_Master_Build_All_Phases_Deterministic_Automation_Contract_Architecture.md)
- [Claude Skills Architecture](../../mindtrace_claude_skills_architecture.md)
- [Phase 3 Healing Engine](../architecture/phases/phase3-healing.md)
