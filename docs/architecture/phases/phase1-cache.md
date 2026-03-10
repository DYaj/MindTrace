# Phase 1: Real Detection & Page Cache

**Status**: Complete (Architecture Frozen)

## Overview

Phase 1 replaces Phase 0's placeholder detection data with real repository scanning and detection, and optionally builds a contract-derived page cache.

**Core Principles:**
- Contract as single source of truth - Cache is derived from contract, not repo
- Deterministic - Same repo → byte-identical contracts + cache
- Hash-linked - Cache includes `contractSha256` for drift detection
- Optional cache - `buildCache: false` by default (enterprise-safe)
- Strict validation - Both contract and cache must pass schema validation
- Backward compatible - Legacy `.mindtrace/contracts/` read fallback

## Architecture

### Page Semantic Cache

The page cache is an optional, contract-derived artifact that provides runtime-optimized access to page metadata:

```
.mcp-cache/
├── pages/
│   ├── <pageId>.json             # One file per page (contract-derived)
│   └── ...
└── index.json                    # Optional index with all pageIds
```

**Key Property**: Every cache page includes `contractSha256` for drift detection.

### Cache Entry Schema

```typescript
type PageCacheEntry = {
  pageId: string;              // Deterministic (from contract page identity)
  contractSha256: string;      // Hash link to contract
  schemaVersion: string;       // Cache schema version
  generatedBy: string;         // "repo-intelligence-mcp@0.2.0"
  // NO generatedAt timestamp
  // NO filesystem metadata
  page: {
    path: string;              // Canonical POSIX path
    semanticRole: string;      // login, dashboard, checkout, etc.
    selectors: Array<{ /* ... */ }>;
    actions: Array<{ /* ... */ }>;
    // ... other page metadata from contract
  };
};
```

## Real Detection Integration

Phase 1 uses real repository scanning to build accurate contracts:

### Detection Functions

- **`scanRepo()`**: File enumeration, signal generation
- **`detectFramework()`**: Playwright/Cypress/Selenium detection
- **`inferStructure()`**: BDD/POM/Native/Hybrid pattern detection
- **`detectLocatorStyle()`**: Locator preference detection (data-testid, role, etc.)
- **`detectAssertionStyle()`**: Assertion style detection (expect, should, etc.)

### Signal Types Generated

- `framework-indicator` - Config files, dependencies
- `bdd-indicator` - `.feature` files, step definitions, Cucumber/Gherkin imports
- `pom-indicator` - Page object directories/patterns
- `locator-style` - `data-testid`, `data-qa`, `data-cy`, `getByRole()`, etc.
- `assertion-indicator` - `expect()`, `.should()`, etc.

## Cache Building Process

### Contract Derivation Boundary

The cache builder strictly enforces contract-only access:

```typescript
// Location: repo-intelligence-mcp/src/tools/buildPageCache.ts

export async function buildPageCache(params: {
  automationContract: AutomationContract;  // FROM contract bundle
  pageKeyPolicy: PageKeyPolicy;            // FROM contract bundle
  contractSha256: string;                  // FROM fingerprint
  outputDir: string;                       // .mcp-cache/
}): Promise<PageCacheIndex>
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

### Cache Generation Flow

```
Repository
    ↓
[scanRepo() → Real Detection]
    ↓
[Generate Contract Bundle → .mcp-contract/]
    ↓
[computeContractFingerprint() → contract.fingerprint.sha256]
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CACHE DERIVATION BOUNDARY (contract bundle only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
[buildPageCache(automationContract, pageKeyPolicy, contractSha256)]
    ↓
[Write Page Cache → .mcp-cache/pages/*.json]
```

### Deterministic Page Identity

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

## Binding to Contracts

### Hash Linkage

Every cache page is bound to its source contract via `contractSha256`:

- Contract fingerprint computed from canonical JSON (no timestamps/metadata)
- Cache pages include matching `contractSha256` field
- Runtime validates cache freshness by comparing hashes

### Drift Detection

**Phase 1 Responsibility**: Guarantee `contractSha256` link exists in cache

**Phase 2 Responsibility**: Enforce cache freshness at runtime

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

## Determinism Guarantees

### 1. Byte-Identical Contracts

**Guarantee**: Running Phase 1 twice on unchanged repo → identical `.mcp-contract/*.json` bytes

**Enforcement:**
- Canonical JSON sorting (deep recursive key sort)
- POSIX path normalization (cross-platform consistency)
- Deterministic signal generation (sorted by ID)
- Deterministic framework scoring (priority + alphabetical tiebreak)
- NO timestamps in contract files (except provenance metadata not included in hash)

### 2. Byte-Identical Cache

**Guarantee**: Running Phase 1 twice on unchanged repo → identical `.mcp-cache/pages/*.json` bytes

**Enforcement:**
- Cache is purely derived from contract bundle (no repo timestamps/metadata)
- Deterministic `pageId` generation (from contract page identity, NOT filesystem order)
- Canonical JSON sorting in cache files
- NO timestamps in cache files (use `generatedBy: "repo-intelligence-mcp@<version>"`)

### 3. Hash Stability

**Guarantee**: Same contract → same `contractSha256`

## Usage

### Generate Contract Only (Default)

```bash
cd repo-intelligence-mcp
npm run build
npx mindtrace-repo-intelligence-mcp

# Via MCP tool (from MCP client like Claude Desktop):
generate_contract_bundle({ repoRoot: "/path/to/repo" })
```

### Generate Contract + Page Cache

```bash
# Via MCP tool (from MCP client):
generate_contract_bundle({
  repoRoot: "/path/to/repo",
  buildCache: true
})
```

### Programmatic

```typescript
import { generateContractBundle } from "./src/tools/generateContractBundle.js";

// Contract only (fast, enterprise-safe)
const result = await generateContractBundle({
  repoRoot: "/path/to/repo",
  mode: "strict"
});

// Contract + cache (dev convenience)
const resultWithCache = await generateContractBundle({
  repoRoot: "/path/to/repo",
  mode: "strict",
  buildCache: true  // Optional
});

if (result.ok) {
  console.log(`Contract: ${result.contractSha256}`);
  console.log(`Files: ${result.filesWritten.join(", ")}`);
}
```

## Migration from Phase 0

**Contract Directory:**
- **Old**: `.mindtrace/contracts/`
- **New**: `.mcp-contract/` (canonical)
- **Fallback**: Legacy path supported (read-only, emits warning)

**No Breaking Changes:**
- Existing Phase 0 contracts in `.mindtrace/contracts/` still work
- Phase 1 will read from legacy path if canonical doesn't exist
- Warning emitted: `⚠️  Using legacy contract directory`

## Generated Files

### Contract Bundle (`.mcp-contract/`)

```
.mcp-contract/
├── automation-contract.json       # Master automation contract (real detection)
├── page-key-policy.json           # Page identity rules
├── contract.meta.json             # Contract metadata
└── contract.fingerprint.sha256    # SHA256 fingerprint (commit marker)
```

**Note**: Legacy path `.mindtrace/contracts/` is supported as read-only fallback.

### Page Cache (`.mcp-cache/`) - Optional

```
.mcp-cache/
├── pages/
│   ├── <pageId>.json             # One file per page (contract-derived)
│   └── ...
└── index.json                    # Optional index with all pageIds
```

## Phase 1 Guarantees

✅ **Deterministic Output**: Same repo → byte-identical contracts + cache
✅ **Contract-Derived Cache**: Cache built strictly from contract (no raw repo access)
✅ **Hash Linkage**: Every cache page includes `contractSha256`
✅ **Schema Validation**: Both contract and cache pass strict schema validation
✅ **Backward Compatible**: Legacy `.mindtrace/contracts/` read fallback

## See Also

- **Design Document**: [Real Detection & Page Cache Design](../../plans/2026-03-03-phase1-real-detection-page-cache-design.md)
- **Implementation Overview**: [repo-intelligence-mcp/README.phase1.md](../../../repo-intelligence-mcp/README.phase1.md)
- **Phase 0 Contracts**: [phase0-contracts.md](phase0-contracts.md)
- **Architecture Overview**: [../overview.md](../overview.md)

## Next Steps

After Phase 1 completion:

1. **Phase 2**: Runtime contract loader
   - Load contracts during test execution
   - Contract-aware runtime context
   - Enforce cache freshness (validate `contractSha256`)

2. **Phase 3**: Healing engine upgrade (contract-aware)
3. **Phase 4**: Cross-framework adapters
