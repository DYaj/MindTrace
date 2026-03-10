# Phase 2: Contract-Awareness Module

**Status**: Implemented
**Version**: 2.0
**Prerequisites**: Phase 0 (Automation Contract), Phase 1 (Page Semantic Cache)

---

## Overview

Phase 2 provides a **deterministic contract-awareness module** that loads and validates Phase 0 contract artifacts, binds Phase 1 page cache, and builds a comprehensive runtime strategy context for test execution, healing, and cross-repo tooling.

The Contract-Awareness Module integrates automation contracts and page cache artifacts into a unified runtime strategy context, enabling deterministic selector strategies, healing policies, and framework-aware test execution.

## Core Principles

- **Additive only** - Zero breaking changes to existing runtime
- **Read-only** for `.mcp-contract/*` and `.mcp-cache/*` (contract and cache directories)
- **Write-only** for `runs/<runId>/artifacts/**` (test run artifacts)
- **Deterministic** - No network calls, no randomness, byte-identical outputs
- **Mode-aware** - COMPLIANCE (strict) vs BEST_EFFORT (permissive) modes
- **Exit code 3** for compliance violations in COMPLIANCE mode

## Key Capabilities

### 1. Deterministic Contract Loading

The module provides dual-read paths for backward compatibility with legacy contract locations:

**Contract Paths (priority order):**
1. Canonical: `.mcp-contract/` (preferred)
2. Legacy: `.mindtrace/contracts/` (fallback with warning)

**Cache Paths (priority order):**
1. Canonical: `.mcp-cache/v1/meta.json` (preferred)
2. Legacy: `.mcp-cache/index.json` (fallback with warning)

The dual-read strategy ensures smooth migration from legacy paths while encouraging adoption of canonical locations.

### 2. Schema Validation

Full AJV schema validation against JSON schemas for all contract files:
- `automation-contract.json` - Master contract with framework and style detection
- `framework-pattern.json` - Framework and architecture style
- `selector-strategy.json` - Locator strategy and risk rules
- `assertion-style.json` - Assertion style and wrappers
- `page-key-policy.json` - Page identity rules
- `repo-topology.json` - Repository scan output
- `wrapper-discovery.json` - Custom wrapper detection

Schema validation ensures contract integrity and prevents runtime errors from malformed artifacts.

### 3. Fingerprint Verification

SHA256 integrity checking for contract files:
- Computes deterministic hash from 7 fingerprinted contract files
- Verifies against stored `automation-contract.hash`
- Detects unauthorized modifications or corruption
- Mode-aware: strict verification in COMPLIANCE mode, permissive in BEST_EFFORT

Fingerprint verification guarantees contract immutability and reproducibility across CI/CD environments.

### 4. Cache Binding

Advisory page cache integration with hash matching:
- Binds Phase 1 page cache to contract hash
- Validates cache-contract compatibility
- Non-fatal cache mismatches (warnings only)
- Provides page count and cache status to runtime

Cache binding enables semantic page identity and high-confidence selector healing when cache is available.

### 5. Runtime Strategy Context

Unified selector and healing policy context for runtime execution:

```typescript
{
  framework: "playwright",
  architecture: "style2-bdd",
  primaryStyle: "cucumber-playwright",

  selectorPreference: ["getByRole", "getByTestId", "getByLabel"],
  selectorRanking: [
    "contract_strategy",      // 1. Contract locator strategy (primary)
    "semantic_cache",         // 2. Semantic page cache (high confidence)
    "last_known_good",        // 3. Historical fallback
    "deterministic_fallback", // 4. Guaranteed coverage
    "llm_advisory"            // 5. LLM-assisted (advisory only)
  ],

  riskRules: {
    allowXPath: false,
    cssLastResort: true,
    requireStableIdsWhenAvailable: true
  },

  pageKeyPolicy: {
    patterns: [...],
    collisionResolution: "deterministic_suffix"
  },

  cache: {
    valid: true,
    bound: true,
    pagesLoaded: 42,
    directory: ".mcp-cache/v1"
  }
}
```

### 6. Atomic Artifact Writing

Crash-safe artifact writing with canonical JSON:
- Deterministic: sorted object keys, no timestamps
- Atomic: temp file + rename prevents corruption
- Reproducible: byte-identical outputs for same inputs
- Structured issues with severity levels (ERROR, WARN)

## Compliance Modes

### COMPLIANCE Mode (Strict)

- Requires all 7 fingerprinted contract files
- Contract errors cause `ok: false` and `exitCode: 3`
- Schema validation strictly enforced
- Fingerprint verification required
- Suitable for production CI/CD environments

### BEST_EFFORT Mode (Permissive)

- Accepts partial contract files
- Contract errors produce warnings but continue
- Permissive for development and debugging
- Allows missing or invalid files
- Suitable for local development and exploration

## Error Handling

### Contract Issues (ERROR severity)
- `CA_CONTRACT_DIR_MISSING` - Missing contract directory
- `CA_MISSING_FILE` - Missing required contract files
- `CA_JSON_PARSE_ERROR` - JSON parse errors
- `CA_SCHEMA_INVALID` - Schema validation failures
- `CA_HASH_MISMATCH` - Fingerprint hash mismatches

### Cache Issues (WARN severity - advisory only)
- `CA_CACHE_DIR_MISSING` - Missing cache directory
- `CA_CACHE_HASH_MISMATCH` - Cache-contract hash mismatch
- `CA_CACHE_LEGACY_PATH` - Legacy cache path usage

### System Issues (WARN severity)
- `CA_LEGACY_PATH` - Legacy contract path usage

All issues are structured with:
- `code` - Error code identifier
- `category` - Issue category (contract, cache, schema, fingerprint)
- `severity` - ERROR or WARN
- `message` - Human-readable description
- `details` - Additional context (optional)

## Public API

### Main Functions

```typescript
import {
  loadContractBundle,
  validateContractBundle,
  verifyFingerprint,
  bindCacheToContract,
  buildRuntimeStrategyContext,
  writeContractAwarenessArtifact,
} from "@mindtrace/ai-runtime/contract-awareness";
```

#### loadContractBundle()
Loads contract files from canonical or legacy directories with dual-read fallback.

#### validateContractBundle()
Validates contract files against JSON schemas using AJV.

#### verifyFingerprint()
Verifies SHA256 fingerprint against stored hash.

#### bindCacheToContract()
Binds page cache to contract with hash matching.

#### buildRuntimeStrategyContext()
Builds unified selector/healing policy context for runtime.

#### writeContractAwarenessArtifact()
Writes atomic, deterministic artifact to runs directory.

## Module Structure

```
mindtrace-ai-runtime/src/contract-awareness/
├── index.ts                 # Public API exports
├── types.ts                 # Type definitions
├── helpers.ts               # Error helpers
├── loader.ts                # Contract loader
├── validator.ts             # AJV validator + fingerprint
├── cache-binding.ts         # Page cache binding
├── strategy-context.ts      # Strategy context builder
├── writer.ts                # Artifact writer
├── schemas/                 # JSON schemas (copied from repo-intelligence-mcp)
│   ├── repo-topology.schema.json
│   ├── selector-policy.schema.json
│   ├── healing-policy.schema.json
│   ├── wrapper-discovery.schema.json
│   ├── policy-decision.schema.json
│   ├── meta.schema.json
│   └── fingerprint.schema.json
└── __tests__/              # Test suites
    ├── types.test.ts
    ├── helpers.test.ts
    ├── loader.test.ts
    ├── validator.test.ts
    ├── cache-binding.test.ts
    ├── strategy-context.ts
    ├── writer.test.ts
    ├── index.test.ts
    └── integration.test.ts
```

## Authority Boundaries

### Read-Only
- `.mcp-contract/*` (canonical) or `.mindtrace/contracts/*` (legacy)
- `.mcp-cache/*` (all cache artifacts)

### Write-Only
- `runs/<runId>/artifacts/contract-awareness.json` (runtime context)
- `runs/<runId>/artifacts/validation.json` (validation issues)

### Never Mutates
- Contract files
- Cache files
- Any repository state

## Determinism Guarantees

Phase 2 provides byte-identical outputs for reproducible CI/CD:

1. **Canonical JSON** - Recursively sorted object keys
2. **No timestamps** - Removed `generatedAt` fields
3. **Deterministic hashing** - Sorted keys before SHA256
4. **Atomic writes** - Temp file + rename prevents corruption

## Integration with Runtime

The Phase 2.2 wrapper provides simplified API for runtime integration:

```typescript
import { applyRuntimeContractContextEnv } from "@mindtrace/ai-runtime/runtime";

const result = applyRuntimeContractContextEnv({
  artifactsDir: "./runs/my-run/artifacts",
  repoRoot: process.cwd(),
  mode: "COMPLIANCE",
});

if (!result.ok) {
  console.error("Contract setup failed");
  process.exit(result.exitCode);
}

// Environment variables set:
// - MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH
// - MINDTRACE_CONTRACT_DIR
// - MINDTRACE_PAGE_CACHE_DIR
```

## Performance

- **Load time**: ~10ms for typical contract (7 files, ~10KB total)
- **Validation time**: ~5ms with AJV schema validation
- **Write time**: ~3ms with atomic write + canonical JSON
- **Total overhead**: ~20ms per test run

## Migration Path

### From Legacy Paths

Move contracts from legacy to canonical paths:

```bash
# Old location (deprecated)
.mindtrace/contracts/

# New location (canonical)
.mcp-contract/
```

Phase 2 will warn with `CA_LEGACY_PATH` but continue to work during transition period.

### From Phase 2.2 to Phase 2.0

Phase 2.2 wrapper now delegates to Phase 2.0 internally. Existing callers continue to work without modification.

## Related Documentation

- **Design Document**: [Phase 2.0 Contract-Awareness Design](../../plans/2026-03-04-phase2.0-contract-awareness-design.md)
- **Implementation Guide**: [Phase 2.0 README](../../../mindtrace-ai-runtime/README.phase2.0.md)
- **Phase 0 Documentation**: [Automation Contracts](./phase0-contracts.md)

## See Also

- [Architecture Overview](../README.md)
- [Reference Documentation](../../reference/README.md)
