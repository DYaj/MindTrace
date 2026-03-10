# ⚠️ DEPRECATED - This file has moved

**New location:** [docs/reference/enterprise-features.md](docs/reference/enterprise-features.md)

This file will be removed in v2.0.0. Please update your bookmarks.

---

# MindTrace Enterprise Features

## 🏢 Enterprise-Grade Architecture

MindTrace for Playwright is designed as a **runtime-governed execution platform**:

```
User → Setup.sh → Root .env (BASE_URL, tenant config)
                     ↓
              MindTrace Runtime (governance layer)
                     ↓
            Framework Adapter (Native/BDD/POM)
                     ↓
                  Tests
                     ↓
        Artifacts + RCA + Audit Trail + History
```

### Key Architectural Principles

1. **Runtime Governs Execution**
   - All config in root `.env` (no framework-level hardcoding)
   - BASE_URL is runtime-configured (supports multi-tenant later)
   - Frameworks read from runtime state

2. **Framework-Agnostic**
   - Style 1 (Native), Style 2 (BDD), Style 3 (POM+BDD)
   - All execute through same runtime layer
   - Consistent governance regardless of style

3. **AI-Assistive, Not Deterministic**
   - Healing suggestions (non-blocking)
   - Root cause analysis (informative)
   - Governance decisions are deterministic
   - AI never decides pass/fail

4. **Multi-Tenant Ready**
   - BASE_URL runtime-configured
   - Future: `--tenant` flag support
   - Isolated execution contexts
   - Audit trails per tenant

5. **CI/CD Safe**
   - Deterministic run names
   - Immutable audit trails
   - Policy-driven gates
   - TeamCity integration

## 🚀 Enterprise Features

### 1. Policy-Driven Governance

**File**: `mindtrace-ai-runtime/policy/policy.yml`

Define rules for:
- Retry strategies per failure category
- Quarantine thresholds
- CI gate rules (fail vs warn)
- Required artifacts
- Architecture enforcement

### 2. Audit Trails

**Directory**: `runs/<runName>/audit/`

- Append-only event log
- Immutable finalization
- Tamper-evident hash chain
- Complete lifecycle tracking

### 3. Historical Intelligence

**Directory**: `history/`

- Cross-run pattern detection
- Flaky test identification
- Selector drift tracking
- Stability scoring

### 4. Artifact Validation

**Schemas**: `mindtrace-ai-runtime/schemas/`

- JSON schema validation
- Required artifact enforcement
- Consistency checks
- SHA-256 hashing

### 5. Observability

**Artifacts**: `runs/<runName>/artifacts/`

- Execution trace maps
- Step-by-step timeline
- Evidence linking (screenshots/traces)
- Network correlation

## 🎯 Usage

### Setup (One-Time)

```bash
./setup.sh
# Choose framework style
# Enter BASE_URL (e.g., https://staging.yourapp.com)
```

### Run Tests

```bash
cd frameworks/style1-native
npm run test:mindtrace
```

Or directly:

```bash
npx mindtrace run --style native
```

### CI/CD Integration

```bash
# TeamCity build step
npx mindtrace run --style native --run-name ${BUILD_ID}

# Validate artifacts
npx mindtrace validate-artifacts --run ${BUILD_ID}

# Apply governance gate
npx mindtrace gate --run ${BUILD_ID} --exit-code ${TEST_EXIT_CODE}
```

## 📊 Run Directory Structure

```
runs/<runName>/
├── artifacts/
│   ├── healed-selectors.json
│   ├── root-cause-summary.json
│   ├── execution-trace-map.json
│   └── failure-narrative.md
├── audit/
│   ├── events.ndjson
│   └── final.json
└── metadata.json
```

## 🔐 Security & Compliance

- **Audit Trails**: Append-only, tamper-evident
- **Artifact Hashing**: SHA-256 integrity verification
- **Policy Versioning**: Track governance rule changes
- **Run Immutability**: Finalized runs cannot be modified

## 🌐 Multi-Tenant Architecture (Future)

Current:
```bash
BASE_URL=https://staging.app.com
npx mindtrace run --style native
```

Future:
```bash
npx mindtrace run --style native --tenant acme-corp
# Runtime loads tenant-specific config
# Isolated runs, artifacts, audit trails
```

## 📈 Stability Scoring

Tests are scored 0-100 based on:
- Pass rate over last N runs
- Retry frequency
- Failure category severity
- Selector healing usage

## 🏗️ Best Practices

1. **Never hardcode BASE_URL in framework configs**
   - Always use root `.env`
   - Read via `process.env.BASE_URL`

2. **Use deterministic run names in CI**
   - `--run-name ${BUILD_ID}`
   - Enables artifact publishing

3. **Review governance policy regularly**
   - Adjust retry thresholds
   - Update quarantine rules
   - Tune gate criteria

4. **Archive old runs**
   - Keep 30 days for trending
   - Export history for long-term analytics

## 🛠️ Troubleshooting

**Issue**: Tests can't reach BASE_URL
- Check root `.env` file
- Verify `BASE_URL=https://...` is set
- Run `cd frameworks/styleX && npm run test:mindtrace`

**Issue**: Governance gate fails unexpectedly
- Review `runs/<runName>/audit/events.ndjson`
- Check `root-cause-summary.json` for isFlaky
- Adjust `policy/policy.yml` if needed

**Issue**: Artifacts missing
- Ensure `postRunGenerateArtifacts` runs
- Check `runs/<runName>/artifacts/` directory
- Validate schemas: `npx mindtrace validate-artifacts --run <name>`

---

**MindTrace Inc.** - Enterprise Test Automation Intelligence
