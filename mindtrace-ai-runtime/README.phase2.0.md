# Phase 2.0: Contract-Awareness Module

## Overview

The Phase 2.0 Contract-Awareness Module provides deterministic contract loading, validation, and strategy context building for MindTrace runtime. It integrates Phase 0 (Automation Contract) and Phase 1 (Page Semantic Cache) artifacts into a unified runtime strategy context.

## Features

- **Deterministic Loading**: Dual-read paths (canonical → legacy) with consistent hash computation
- **Schema Validation**: Full AJV validation against JSON schemas
- **Fingerprint Verification**: SHA256 integrity checking
- **Cache Binding**: Advisory page cache integration with hash matching
- **Strategy Context**: Unified selector/healing policy context for runtime
- **Atomic Writes**: Crash-safe artifact writing with canonical JSON
- **Authority Boundaries**: Read-only for contracts/cache, write-only for artifacts

## Architecture

### Dual-Read Paths

Contract and cache locations follow a dual-read strategy for backward compatibility:

**Contract Paths (priority order):**
1. Canonical: `.mcp-contract/` (preferred)
2. Legacy: `.mindtrace/contracts/` (fallback)

**Cache Paths (priority order):**
1. Canonical: `.mcp-cache/v1/meta.json`
2. Legacy: `.mcp-cache/index.json`

### Error Handling

**Contract Issues (ERROR severity):**
- Missing contract directory: `CA_CONTRACT_DIR_MISSING`
- Missing required files: `CA_MISSING_FILE`
- JSON parse errors: `CA_JSON_PARSE_ERROR`
- Schema validation failures: `CA_SCHEMA_INVALID`
- Hash mismatches: `CA_HASH_MISMATCH`

**Cache Issues (WARN severity - advisory only):**
- Missing cache directory: `CA_CACHE_DIR_MISSING`
- Cache hash mismatches: `CA_CACHE_HASH_MISMATCH`

**System Issues (WARN severity):**
- Legacy path usage: `CA_LEGACY_PATH`

### Compliance Modes

**COMPLIANCE Mode:**
- Requires all 7 fingerprinted contract files
- Contract errors cause `ok: false` and `exitCode: 3`
- Strict validation enforcement

**BEST_EFFORT Mode:**
- Accepts partial contract files
- Contract errors produce warnings but continue
- Permissive for development/debugging

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

#### 1. Load Contract Bundle

```typescript
const bundle = loadContractBundle({
  repoRoot: "/path/to/repo",
  mode: "COMPLIANCE", // or "BEST_EFFORT"
});

// Returns: LoadContractBundleResult
// { ok: true, contractDir, contractHash, files, issues }
// or
// { ok: false, contractDir: null, contractHash: null, files: {}, issues }
```

#### 2. Validate Contract Bundle

```typescript
const validation = validateContractBundle(bundle);

// Returns: ContractValidationResult
// { ok: true/false, issues: ContractAwarenessIssue[] }
```

#### 3. Verify Fingerprint

```typescript
const fingerprint = verifyFingerprint(bundle);

// Returns: ContractValidationResult
// { ok: true/false, issues: ContractAwarenessIssue[] }
```

#### 4. Bind Cache to Contract

```typescript
const cache = bindCacheToContract({
  repoRoot: "/path/to/repo",
  contractHash: bundle.contractHash,
});

// Returns: PageCacheBindResult
// { ok: true (always), cacheDir, cacheHash, issues }
```

#### 5. Build Runtime Strategy Context

```typescript
const context = buildRuntimeStrategyContext({
  contractBundle: bundle,
  validation,
  fingerprint,
  cache,
});

// Returns: RuntimeStrategyContext
// {
//   ok: true/false,
//   contractHash,
//   cacheHash,
//   selectorPolicy,
//   healingPolicy,
//   pageCacheBySite,
//   issues,
// }
```

#### 6. Write Contract Awareness Artifact

```typescript
writeContractAwarenessArtifact({
  artifactsDir: "/path/to/runs/<runId>/artifacts",
  context,
});

// Writes: runs/<runId>/artifacts/contract-awareness.json
```

### Types

```typescript
import type {
  ContractAwarenessIssue,
  LoadContractBundleResult,
  ContractValidationResult,
  PageCacheBindResult,
  RuntimeStrategyContext,
  ComplianceMode,
} from "@mindtrace/ai-runtime/contract-awareness";
```

### Helper Functions

```typescript
import {
  createIssue,
  getSeverity,
  issuesBySeverity,
} from "@mindtrace/ai-runtime/contract-awareness";

// Create an issue
const issue = createIssue("CA_MISSING_FILE", "file.json not found", {
  file: "file.json",
});

// Get severity for error code
const severity = getSeverity("CA_MISSING_FILE"); // "ERROR"

// Group issues by severity
const { ERROR, WARN } = issuesBySeverity(issues);
```

## Usage Examples

### Basic Usage

```typescript
import {
  loadContractBundle,
  validateContractBundle,
  verifyFingerprint,
  bindCacheToContract,
  buildRuntimeStrategyContext,
  writeContractAwarenessArtifact,
} from "@mindtrace/ai-runtime/contract-awareness";

// 1. Load contract
const bundle = loadContractBundle({
  repoRoot: process.cwd(),
  mode: "COMPLIANCE",
});

if (!bundle.ok) {
  console.error("Contract load failed:", bundle.issues);
  process.exit(3);
}

// 2. Validate
const validation = validateContractBundle(bundle);

// 3. Verify fingerprint
const fingerprint = verifyFingerprint(bundle);

// 4. Bind cache
const cache = bindCacheToContract({
  repoRoot: process.cwd(),
  contractHash: bundle.contractHash,
});

// 5. Build context
const context = buildRuntimeStrategyContext({
  contractBundle: bundle,
  validation,
  fingerprint,
  cache,
});

// 6. Write artifact
writeContractAwarenessArtifact({
  artifactsDir: "./runs/my-run/artifacts",
  context,
});

// 7. Check result
if (!context.ok) {
  console.error("Contract awareness failed:", context.issues);
  process.exit(3);
}

console.log("✅ Contract loaded successfully");
console.log("Contract hash:", context.contractHash);
console.log("Selector strategy:", context.selectorPolicy.strategy);
```

### Error Handling

```typescript
import { issuesBySeverity } from "@mindtrace/ai-runtime/contract-awareness";

const context = buildRuntimeStrategyContext({
  contractBundle: bundle,
  validation,
  fingerprint,
  cache,
});

const { ERROR, WARN } = issuesBySeverity(context.issues);

if (ERROR.length > 0) {
  console.error("❌ Contract errors:");
  ERROR.forEach((issue) => {
    console.error(`  [${issue.code}] ${issue.message}`);
  });
  process.exit(3);
}

if (WARN.length > 0) {
  console.warn("⚠️ Contract warnings:");
  WARN.forEach((issue) => {
    console.warn(`  [${issue.code}] ${issue.message}`);
  });
}
```

### Using Phase 2.2 Wrapper

The Phase 2.2 wrapper provides a simplified API:

```typescript
import { applyRuntimeContractContextEnv } from "@mindtrace/ai-runtime/runtime";

const result = applyRuntimeContractContextEnv({
  artifactsDir: "./runs/my-run/artifacts",
  repoRoot: process.cwd(),
  mode: "COMPLIANCE",
});

if (!result.ok) {
  console.error("Contract setup failed:");
  result.errors.forEach((err) => console.error(`  ${err}`));

  if (result.exitCode === 3) {
    process.exit(3);
  }
}

// Environment variables set:
// - MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH
// - MINDTRACE_CONTRACT_DIR
// - MINDTRACE_PAGE_CACHE_DIR

console.log("✅ Contract context applied");
```

## Testing

Run the full test suite:

```bash
cd mindtrace-ai-runtime
npm test
```

Run specific test suites:

```bash
# Unit tests
npm test -- loader.test.ts
npm test -- validator.test.ts
npm test -- cache-binding.test.ts
npm test -- strategy-context.test.ts
npm test -- writer.test.ts

# Integration tests
npm test -- integration.test.ts

# Phase 2.2 wrapper tests
npm test -- contract-plumbing.test.ts
```

## File Structure

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
    ├── strategy-context.test.ts
    ├── writer.test.ts
    ├── index.test.ts
    └── integration.test.ts
```

## Determinism Guarantees

Phase 2.0 provides byte-identical outputs for reproducible CI/CD:

1. **Canonical JSON**: Recursively sorted object keys
2. **No timestamps**: Removed `generatedAt` fields
3. **Deterministic hashing**: Sorted keys before SHA256
4. **Atomic writes**: Temp file + rename prevents corruption

## Migration Guide

### From Phase 2.2 to Phase 2.0

If you're using the old Phase 2.2 API, migration is automatic:

```typescript
// Old Phase 2.2 (still works)
import { applyRuntimeContractContextEnv } from "@mindtrace/ai-runtime/runtime";

const context = applyRuntimeContractContextEnv({
  artifactsDir: "./runs/my-run/artifacts",
  repoRoot: process.cwd(),        // Now required
  mode: "COMPLIANCE",             // Now required
});

// Phase 2.2 wrapper now delegates to Phase 2.0 internally
```

### Canonical Path Migration

Move your contracts from legacy to canonical paths:

```bash
# Old location (deprecated)
.mindtrace/
└── contracts/
    ├── repo-topology.json
    └── ...

# New location (canonical)
.mcp-contract/
├── repo-topology.json
└── ...
```

Phase 2.0 will warn with `CA_LEGACY_PATH` but continue to work.

## Performance

- **Load time**: ~10ms for typical contract (7 files, ~10KB total)
- **Validation time**: ~5ms with AJV schema validation
- **Write time**: ~3ms with atomic write + canonical JSON
- **Total overhead**: ~20ms per test run

## Troubleshooting

### Contract Not Found

```
Error: CA_CONTRACT_DIR_MISSING
```

**Solution**: Create `.mcp-contract/` directory with required files:
- repo-topology.json
- selector-policy.json
- healing-policy.json
- wrapper-discovery.json
- policy-decision.json
- meta.json
- fingerprint.json

### Schema Validation Failed

```
Error: CA_SCHEMA_INVALID
```

**Solution**: Check contract files match JSON schemas in `schemas/` directory.

### Hash Mismatch

```
Error: CA_HASH_MISMATCH
```

**Solution**: Regenerate `fingerprint.json` with current contract hash:

```typescript
const bundle = loadContractBundle({ repoRoot, mode: "BEST_EFFORT" });
const fingerprint = {
  schema_version: "0.1.0",
  contractHash: bundle.contractHash,
  mode: "strict",
};
// Write fingerprint.json
```

### Cache Hash Mismatch

```
Warning: CA_CACHE_HASH_MISMATCH
```

**Note**: This is a warning only. Cache is advisory and doesn't block execution.

**Solution (optional)**: Regenerate page cache with matching contract hash.

## License

Same as MindTrace project.

## Contributing

See main MindTrace contributing guidelines.
