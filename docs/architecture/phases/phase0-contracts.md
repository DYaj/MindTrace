# Phase 0: Contract Bundle Generation

**Status**: Complete (Architecture Frozen)

## Overview

Phase 0 implements deterministic contract bundle generation for MindTrace. The contract bundle is the **source of truth** for all downstream phases (cache building, runtime execution, healing, adaptation).

### Core Principle

Contract generation is **always recompute, never mutate, write-once per run**. The contract bundle defines the automation contract that governs all test execution and healing behavior.

## Architecture Summary

### Generator Pattern

Phase 0 follows a **modular pure generators + single write authority** pattern:

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

### Core Components

**Pure Generators** (No I/O, deterministic):
- `generateAutomationContract()` - Master contract from detection outputs
- `generatePageKeyPolicy()` - Page identity rules from topology
- `generateContractMeta()` - Metadata with contract inputs
- `detectPrimaryStyle()` - Deterministic style selection with tiebreak

**Write Layer** (Atomic writes):
- `writeContractBundle()` - Writes all contract files atomically
- `validateContractBundle()` - Schema validation + hash integrity check
- `computeContractFingerprint()` - Filename-bound hashing
- `writeFingerprintAtomic()` - Atomic hash file write

**Evidence Retrofit**:
- `retrofitEvidenceBundle()` - Upgrades empty-file entries, prevents duplicates

## Generated Files

```
.mindtrace/contracts/
├── automation-contract.json      # Master automation contract
├── page-key-policy.json          # Page identity rules
├── contract.meta.json            # Contract metadata
├── contract.fingerprint.sha256   # SHA256 fingerprint (commit marker)
├── repo-topology.json            # Repository scan output
├── framework-pattern.json        # Framework + style detection
├── selector-strategy.json        # Locator strategy
├── assertion-style.json          # Assertion style
└── wrapper-discovery.json        # Custom wrappers
```

**Fingerprint Files** (7 files hashed):
1. `assertion-style.json`
2. `automation-contract.json`
3. `framework-pattern.json`
4. `page-key-policy.json`
5. `repo-topology.json`
6. `selector-strategy.json`
7. `wrapper-discovery.json`

**Note**: The fingerprint (`.sha256` file) is written last and acts as a commit marker. Its presence means all files exist, passed validation, and the bundle is complete and valid.

## Design Principles

### Determinism Rules

- **Canonical JSON**: Deep recursive key sorting, 2-space indent, trailing newline
- **POSIX Paths**: Forward-slash normalized, repo-relative paths
- **Deterministic Ordering**: All arrays affecting fingerprint are sorted deterministically
- **Always Recompute**: Never load existing contract and modify—always regenerate

### Evidence Everywhere

All inferences are backed by file references. Evidence retrofit **merges** (never overwrites):

1. Upgrade empty-file entries if new evidence has valid paths
2. Add new evidence if not present
3. Preserve existing valid evidence

### Atomic Writes

- **Bundle Write**: Temp directory → copy to final → cleanup
- **Fingerprint Write**: OS-level atomic rename (temp → final)
- **Hash as Commit Marker**: Written last, validates all files written

## Phase 0 Guarantees

✅ **Deterministic Output**: Same inputs → byte-identical contracts
✅ **Schema Validation**: All contracts pass JSON schema validation
✅ **Hash Integrity**: Fingerprint verifies all contract files
✅ **Atomic Writes**: Bundle write succeeds completely or fails completely
✅ **Evidence Preservation**: Retrofit never overwrites valid evidence

## MCP Tool

**Tool**: `generate_contract_bundle`

**Input**:
- `repoRoot` (required): Absolute path to repository root
- `mode` (optional): `"strict"` or `"best_effort"` (default: `"best_effort"`)

**Output**:
```json
{
  "ok": true,
  "hash": "abc123...",
  "filesWritten": [
    "automation-contract.json",
    "contract.fingerprint.sha256",
    "contract.meta.json",
    "page-key-policy.json"
  ]
}
```

### Strict vs Best-Effort Mode

**Strict Mode** (CI/CD):
- Requires ALL 7 fingerprint files to exist
- Fails fast if any file missing
- Fails if hash mismatch
- Fails if schema validation fails

**Best-Effort Mode** (Local development):
- Computes fingerprint over available files (min 1)
- Warns about missing files
- Continues execution
- Writes warnings to `contract.meta.json`

## Write Authority Model

| Artifact Location         | Authority Writer                | Mutability         | Read By                  |
| ------------------------- | ------------------------------- | ------------------ | ------------------------ |
| `.mcp-contract/*`         | repo-intelligence-mcp (Phase 0) | WRITE-ONCE PER RUN | runtime, adapters, cache |
| `.mcp-cache/*`            | page-cache builder (Phase 1)    | CONTRACT-BOUND     | runtime, healing engine  |
| `runs/*/artifacts/*`      | runtime                         | RUN-LOCAL          | governance               |
| `runs/*/audit/*`          | runtime                         | APPEND-ONLY        | governance, enterprise   |
| `history/run-index.jsonl` | runtime learning loop (Phase 5) | APPEND-ONLY        | adapters, reporting      |

**Key Rule**: repo-intelligence-mcp OWNS `.mcp-contract/*`. Runtime MUST NOT write to contract directory.

## Cache Invalidation

Cache validity is determined by:

```
.mcp-cache/meta.json.contract_hash == .mcp-contract/automation-contract.hash
```

If hashes mismatch, cache is INVALID and must be rebuilt.

## Testing

**Test Coverage**: 48 tests total (all passing)
- Unit tests: Core utilities, generators, validation, fingerprinting
- Integration tests: End-to-end bundle generation, determinism, schema validation

```bash
cd repo-intelligence-mcp
npm test
```

## Non-Goals (Out of Scope)

Phase 0 does NOT:

- Build page cache (Phase 1)
- Load contracts into runtime (Phase 2)
- Implement healing logic (Phase 3)
- Build cross-framework adapters (Phase 4)
- Implement learning loop (Phase 5)
- Execute tests or make policy decisions
- Perform real repository scanning (placeholder data in Phase 0 initially)

## Related Documentation

- [Design Document](../../plans/2026-03-02-phase0-contract-generators-design.md) - Complete architecture specification
- [Implementation Plan](../../plans/2026-03-02-phase0-contract-generators-implementation.md) - Task breakdown and implementation details
- [Phase 0 README](../../../repo-intelligence-mcp/README.phase0.md) - Developer guide and usage

## Implementation Status

**Status**: Complete (13/13 tasks)

All Phase 0 contract generation functionality is implemented and tested. Architecture is frozen. See design document for complete specification.
