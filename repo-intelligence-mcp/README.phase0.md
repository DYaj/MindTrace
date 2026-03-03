# Phase 0 Contract Generators

**Status**: Complete (Architecture Frozen)
**Design Doc**: [docs/plans/2026-03-02-phase0-contract-generators-design.md](../docs/plans/2026-03-02-phase0-contract-generators-design.md)
**Implementation Plan**: [docs/plans/2026-03-02-phase0-contract-generators-implementation.md](../docs/plans/2026-03-02-phase0-contract-generators-implementation.md)

## Overview

Phase 0 implements deterministic contract bundle generation for MindTrace. The contract bundle is the source of truth for all downstream phases (cache building, runtime execution, healing, adaptation).

## Generated Files

```
.mindtrace/contracts/
├── automation-contract.json    # Master automation contract
├── page-key-policy.json         # Page identity rules
├── contract.meta.json           # Contract metadata
└── contract.fingerprint.sha256  # SHA256 fingerprint (commit marker)
```

**Note**: Detection artifacts (repo-topology.json, framework-pattern.json, selector-strategy.json, assertion-style.json, wrapper-discovery.json) are generated with placeholder data in Phase 0. Real detection integration coming in Phase 1.

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

## Usage

### Via MCP Server

```bash
cd repo-intelligence-mcp
npm run mcp:server
```

### Programmatic

```typescript
import { generateContractBundle } from "./src/tools/generateContractBundle.js";

const result = await generateContractBundle({
  repoRoot: "/path/to/repo",
  mode: "strict"
});

if (result.ok) {
  console.log(`Contract generated: ${result.hash}`);
  console.log(`Files written: ${result.filesWritten.join(", ")}`);
} else {
  console.error(`Error: ${result.error}`);
}
```

## Architecture

### Core Components

- **Pure Generators**: No I/O, deterministic, return `{ ok, data }` or `{ ok, error }`
  - `generateAutomationContract()` - Master contract from detection outputs
  - `generatePageKeyPolicy()` - Page identity rules from topology
  - `generateContractMeta()` - Metadata with contract inputs
  - `detectPrimaryStyle()` - Deterministic style selection with tiebreak

- **Write Layer**: Atomic-ish writes (temp → copy → cleanup)
  - `writeContractBundle()` - Writes all contract files atomically
  - `validateContractBundle()` - Schema validation + hash integrity check

- **Fingerprint**: SHA256 over canonical JSON of all contract files
  - `computeContractFingerprint()` - Filename-bound hashing
  - `writeFingerprintAtomic()` - Atomic hash file write

- **Evidence Retrofit**: Merge evidence without overwriting
  - `retrofitEvidenceBundle()` - Upgrades empty-file entries, prevents duplicates

### Testing

```bash
cd repo-intelligence-mcp
npm test
```

**Test Coverage**:
- 48 tests total (all passing)
- Unit tests: Core utilities, generators, validation, fingerprinting
- Integration tests: End-to-end bundle generation, determinism, schema validation

## Design Principles

- **Always recompute**: Never load existing contract and modify
- **Write-once per run**: Contract is immutable after generation
- **Deterministic**: Same inputs → same outputs (byte-identical)
  - Canonical JSON (deep recursive key sorting, 2-space indent)
  - POSIX normalized paths (forward-slash, repo-relative)
  - Deterministic primary style selection (priority + alphabetical tiebreak)
- **Evidence everywhere**: All inferences backed by file references
- **Hash as commit marker**: Fingerprint written last, validates all files written

## Phase 0 Guarantees

✅ **Deterministic Output**: Same inputs → byte-identical contracts
✅ **Schema Validation**: All contracts pass JSON schema validation
✅ **Hash Integrity**: Fingerprint verifies all contract files
✅ **Atomic Writes**: Bundle write succeeds completely or fails completely
✅ **Evidence Preservation**: Retrofit never overwrites valid evidence

## Non-Goals (Out of Scope)

Phase 0 does NOT:

- Build page cache (Phase 1)
- Load contracts into runtime (Phase 2)
- Implement healing logic (Phase 3)
- Build cross-framework adapters (Phase 4)
- Implement learning loop (Phase 5)
- Execute tests or make policy decisions
- Perform real repository scanning (placeholder data in Phase 0)
- Detect real framework/locator/assertion patterns (placeholders with TODO)

## Implementation Status

**Tasks Completed** (13/13):

1. ✅ Setup Type Definitions & Constants
2. ✅ JSON Schemas
3. ✅ Core Utilities (determinism, normalization)
4. ✅ Schema Validation
5. ✅ Fingerprint Computation
6. ✅ Pure Generators Part 1 (detectPrimaryStyle, buildPaths)
7. ✅ Pure Generators Part 2 (generateAutomationContract, generatePageKeyPolicy, generateContractMeta)
8. ✅ Evidence Retrofit
9. ✅ Write Layer (writeContractBundle, validateContractBundle)
10. ✅ Main Tool Coordinator (generateContractBundle)
11. ✅ MCP Server Registration
12. ✅ Integration Test (end-to-end)
13. ✅ Documentation & Finalization

**Commits**: 16 commits on branch `task10-main-coordinator`

## Next Steps

After Phase 0 completion:

1. ✅ **Phase 1**: Real Detection & Page Cache (COMPLETE)
   - Real repository scanning (replaced placeholders)
   - Real framework/locator/assertion detection
   - Optional contract-derived page cache
   - See: [README.phase1.md](README.phase1.md)

2. **Phase 2**: Runtime contract loader
   - Load contracts during test execution
   - Contract-aware runtime context
   - Enforce cache freshness (validate `contractSha256`)

3. **Phase 3**: Healing engine upgrade (contract-aware)
4. **Phase 4**: Cross-framework adapters

## References

- **Design Document**: [docs/plans/2026-03-02-phase0-contract-generators-design.md](../../docs/plans/2026-03-02-phase0-contract-generators-design.md)
- **Implementation Plan**: [docs/plans/2026-03-02-phase0-contract-generators-implementation.md](../../docs/plans/2026-03-02-phase0-contract-generators-implementation.md)
