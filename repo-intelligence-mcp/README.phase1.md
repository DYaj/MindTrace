# Phase 1: Real Detection & Page Cache

**Status**: Complete (Architecture Frozen)
**Design Doc**: [docs/plans/2026-03-03-phase1-real-detection-page-cache-design.md](../../docs/plans/2026-03-03-phase1-real-detection-page-cache-design.md)

## Overview

Phase 1 replaces Phase 0's placeholder detection data with real repository scanning and detection, and optionally builds a contract-derived page cache.

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

**Key Property**: Every cache page includes `contractSha256` for drift detection.

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

## Real Detection

Phase 1 uses real repository scanning and detection:

- **`scanRepo()`**: File enumeration, signal generation
- **`detectFramework()`**: Playwright/Cypress/Selenium detection
- **`inferStructure()`**: BDD/POM/Native/Hybrid pattern detection
- **`detectLocatorStyle()`**: Locator preference detection (data-testid, role, etc.)
- **`detectAssertionStyle()`**: Assertion style detection (expect, should, etc.)

## Phase 1 Guarantees

✅ **Deterministic Output**: Same repo → byte-identical contracts + cache
✅ **Contract-Derived Cache**: Cache built strictly from contract (no raw repo access)
✅ **Hash Linkage**: Every cache page includes `contractSha256`
✅ **Schema Validation**: Both contract and cache pass strict schema validation
✅ **Backward Compatible**: Legacy `.mindtrace/contracts/` read fallback

## Migration from Phase 0

**Contract Directory:**
- **Old**: `.mindtrace/contracts/`
- **New**: `.mcp-contract/` (canonical)
- **Fallback**: Legacy path supported (read-only, emits warning)

**No Breaking Changes:**
- Existing Phase 0 contracts in `.mindtrace/contracts/` still work
- Phase 1 will read from legacy path if canonical doesn't exist
- Warning emitted: `⚠️  Using legacy contract directory`

## Next Steps

After Phase 1 completion:

1. **Phase 2**: Runtime contract loader
   - Load contracts during test execution
   - Contract-aware runtime context
   - Enforce cache freshness (validate `contractSha256`)

2. **Phase 3**: Healing engine upgrade (contract-aware)
3. **Phase 4**: Cross-framework adapters

## References

- **Design Doc**: [docs/plans/2026-03-03-phase1-real-detection-page-cache-design.md](../../docs/plans/2026-03-03-phase1-real-detection-page-cache-design.md)
- **Phase 0 README**: [README.phase0.md](README.phase0.md)
