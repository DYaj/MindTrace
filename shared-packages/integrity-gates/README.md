# @mindtrace/integrity-gates

Governance Safety Layer (GSL) enforcement: contract integrity, cache integrity, and drift safety.

## Purpose

Implements missing GSL enforcement domains from MindTrace master architecture:

1. **Contract Integrity Gate** - Verify contract before execution (hard authority)
2. **Cache Integrity Gate** - Verify cache binding and validity (path-sensitive)
3. **Drift Safety System** - Detect contract changes, invalidate stale cache, audit drift events

## Installation

```bash
npm install @mindtrace/integrity-gates
```

## Usage

### Contract Integrity (Hard Authority Gate)

```typescript
import { verifyContractIntegrity } from '@mindtrace/integrity-gates';

const result = verifyContractIntegrity('/repo/root');

if (result.status === 'invalid') {
  console.error(`Contract integrity failure: ${result.error.code}`);
  process.exit(3); // Policy/compliance violation
}

const verifiedContract = result.contract;
```

### Cache Integrity (Path-Sensitive)

```typescript
import { verifyCacheIntegrity } from '@mindtrace/integrity-gates';

const cacheResult = verifyCacheIntegrity('/repo/root', verifiedContract, {
  mode: 'strict',
  cacheRequiredForPath: true
});

if (cacheResult.status === 'invalid') {
  if (cacheResult.recommendedAction === 'fail_hard') {
    console.error(`Cache required but invalid: ${cacheResult.reason.code}`);
    process.exit(3);
  } else {
    console.warn(`Cache invalid, continuing without cache`);
  }
}
```

### Drift Detection + Audit

```typescript
import { detectDrift, DriftAudit } from '@mindtrace/integrity-gates';

// Pure detection
const driftResult = detectDrift(verifiedContract, cacheMeta.contractSha256);

if (driftResult.drift) {
  // Record audit event
  const audit = new DriftAudit('runs/test-run/audit');
  audit.appendDriftEvent({
    eventType: 'cache_contract_mismatch',
    previousHash: driftResult.previousHash,
    currentHash: driftResult.currentHash,
    driftType: driftResult.driftType,
    cacheInvalidated: true,
    executionMode: 'default',
    actionTaken: 'continue_without_cache',
    timestamp: new Date().toISOString(),
    runId: 'test-run'
  });
}
```

## Architecture

### Three-Tier Enforcement

1. **Build-Time** - Early detection during artifact generation
2. **Runtime Init** - Hard authority gate before execution
3. **Cache-Aware** - Conditional gate before cache-dependent paths

### Exit Code Contract

- `0` - Success
- `1` - Test failure (not used by integrity gates)
- `2` - Infrastructure failure (not used by integrity gates)
- `3` - **Policy/compliance violation** (all integrity gate failures)

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Build
npm run build

# Type check
npm run type-check
```

## Phase A vs Phase B

**Phase A (Current):** Integrity gates with copied deterministic logic from repo-intelligence-mcp

**Phase B (Future):** Extract shared deterministic primitives to `@mindtrace/deterministic-core`

Parity tests ensure no divergence before extraction.

## License

MIT
