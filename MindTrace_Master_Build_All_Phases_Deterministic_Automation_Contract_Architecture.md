# MindTrace — ClaudeCode Master Build (PLATINUM)

**Date:** 2026-03-03 (Asia/Tokyo)  
**Version:** PLATINUM (FINAL base + Contract-Awareness module)
**Status:** Production-ready specification (additive; audit-grade)

---

# Architecture Alignment Update (2026-03-03)

The deterministic healing engine (Phase 3) already exists in the repository.
The purpose of Phase 0–2 is to establish contract identity and semantic cache
as the authoritative inputs to that healing engine.

Contract directory canonical path: .mcp-contract/
Legacy read fallback: .mindtrace/contracts/

---

# MindTrace: Phase 0 → Phase 6 (Full System, Additive Only)

You are a **Principal Automation Infrastructure Engineer** working inside:

`mindtrace-for-playwright/`

Your job is to **implement the remaining architecture for ALL phases** of MindTrace **WITHOUT breaking any existing runtime or governance behavior**.

This prompt must be followed strictly.

---

# 0. EXISTING SYSTEM (DO NOT BREAK)

The repo already contains:

## Runtime Kernel (Stable CI)

- `mindtrace-ai-runtime`
- Required run layout:
  ```
  runs/<runName>/
    artifacts/
    audit/
  history/run-index.jsonl
  ```

## Governance MCP

- Schema validation
- Deterministic CI exit codes: 0 (pass) | 1 (fail) | 2 (runtime error) | 3 (compliance invalid)

## Repo Intelligence MCP (Partial Phase 0 already built)

Already generates:

```
.mindtrace/contracts/
  automation-contract.json
  repo-topology.json
  framework-pattern.json
  selector-strategy.json
  assertion-style.json
  wrapper-discovery.json
  phase0-summary.json
```

---

# NON NEGOTIABLE RULES

- Additive only changes
- Never break runtime exit code contract
- Never rename runtime artifact files
- Never change run layout
- Deterministic file discovery
- Canonical JSON stringify
- POSIX normalized paths
- No network calls required (core tool)
- AI optional only (never governance authority)
- Enforce authority boundaries
- Maintain schema versioning compatibility

---

- Contract-awareness module is mandatory for runtime (Phase 2+) and MUST be deterministic
- Contract-awareness is READ-ONLY for `.mcp-contract/*` and `.mcp-cache/*` (run-local writes only)
- Contract-awareness errors map to compliance invalid (exit code 3) in strict mode

# RUN DIRECTORY CONTRACT (ChatGPT Enhancement)

All runtime executions MUST write into `runs/<runId>/` (never outside):

```
runs/<runId>/
  metadata.json                 # run id, timestamps, repo roots, commit refs
  prompts/
    active.md                   # prompt used (sha referenced)
  artifacts/
    phase0/
      bundle_path.txt           # points to .mindtrace/contracts location
      contract_hash.txt         # stored hash used for run
      validation.json           # AJV + fingerprint validation result
    phase1/
      cache_manifest.json       # list of page cache files + hashes
    runtime/
      policy-decision.json      # governance gate result (BEFORE healing)
      exit.json                 # stable exit codes + summary
    phaseX/
      automation_patch.json     # cross-repo patch artifact
  logs/
    orchestrator.log
    governance.log
    validation.log
```

**Invariant:** `policy-decision.json` MUST be written before any healing attempts (Phase 3+).

---

# AUTHORITY MODEL (WHO WRITES WHAT)

## 1.1 Source-of-Truth Artifacts

| Artifact                  | Authority                  | Mutability         | Notes                  |
| ------------------------- | -------------------------- | ------------------ | ---------------------- |
| `.mindtrace/contracts/*`  | repo-intelligence-mcp (P0) | WRITE-ONCE PER RUN | Contract lock          |
| `.mcp-cache/*`            | page-cache builder (P1)    | CONTRACT-BOUND     | Bound to contract hash |
| `runs/*/artifacts/*`      | runtime                    | RUN-LOCAL          | Execution results      |
| `runs/*/audit/*`          | runtime                    | APPEND-ONLY        | Immutable audit trail  |
| `history/run-index.jsonl` | runtime learning (P5)      | APPEND-ONLY        | Learning history       |

## 1.2 Strict Rules

- Runtime **MUST NOT write** to `.mindtrace/contracts/*`
- Runtime **MUST NOT write** to `.mcp-cache/*`
- LLM/AI **MUST NOT write** to contract/cache
- Healing MUST respect contract strategy (not override)

---

# MindTrace — Data Moat + Governance Safety Layer

## Purpose

This document adds two strategic architecture layers to MindTrace:

1. **Automation Contract Intelligence Network (ACIN)**  
   A privacy-safe intelligence layer that creates a long-term data moat around automation reliability.

2. **Governance Safety Layer (GSL)**  
   A hard-stop safety architecture that prevents AI, healing, cache drift, or contract drift from silently corrupting automation.

These additions are fully aligned with the existing MindTrace master system:

- deterministic core first
- contract is the source of truth
- governance decides pass/fail
- stable exit codes
- immutable audit trails
- schema-validated artifacts
- AI is assistive only

---

# 1. Automation Contract Intelligence Network (ACIN)

## What It Is

ACIN is a privacy-safe intelligence network that learns from automation reliability signals across runs, repositories, and organizations.

It does **not** collect raw source code, private DOM content, or business-sensitive UI details.

It only collects **normalized automation reliability signals**.

## Why It Matters

Traditional frameworks can copy features such as:

- test execution
- retry logic
- self-healing
- selector ranking
- AI summaries

But they cannot easily copy:

- years of automation reliability patterns
- cross-project selector stability intelligence
- contract evolution outcomes
- framework-specific failure distributions
- aggregated UI breakage signatures

That creates a **data moat**.

## Core Value

MindTrace becomes more than a test framework.

It becomes an **automation intelligence platform** that knows:

- which selector strategies are most stable
- which page structures tend to break tests
- which contract patterns survive UI change best
- which healing strategies succeed by framework, action type, and page category
- which releases are likely to cause automation regression before execution starts

---

## Where ACIN Fits

Existing architecture:

Repo Intelligence  
↓  
Contract Generation  
↓  
Page Semantic Cache  
↓  
Runtime Execution  
↓  
Governance Decision  
↓  
Healing Engine  
↓  
Claude Skills Intelligence

Enhanced architecture:

Repo Intelligence  
↓  
Contract Generation  
↓  
Page Semantic Cache  
↓  
Runtime Execution  
↓  
Governance Decision  
↓  
Healing Engine  
↓  
Claude Skills Intelligence  
↓  
**Automation Contract Intelligence Network (ACIN)**

---

## What ACIN Collects

ACIN must collect **normalized signals only**.

### Allowed signal types

- framework type
- selector strategy type
- failure category
- healing outcome
- page category
- route shape
- contract quality metrics
- cache drift events
- selector stability patterns
- contract evolution proposal patterns
- predicted breakage confidence buckets

### Example normalized signal

```json
{
  "framework": "playwright",
  "primaryStyle": "bdd",
  "selectorStrategy": "text",
  "pageCategory": "checkout",
  "failureType": "missing-element",
  "healingSuccess": false,
  "predictionBucket": "high-risk"
}
```

### Not allowed

ACIN must **never** ingest:

- raw source code
- customer DOM snapshots
- credentials
- private HTML content
- proprietary UI text
- secrets
- session tokens
- PII

---

## ACIN Output Artifacts

Suggested outputs:

- `global-test-intelligence.json`
- `contract-quality-benchmarks.json`
- `selector-stability-benchmarks.json`
- `release-risk-patterns.json`

### Example output

```json
{
  "patterns": [
    {
      "pattern": "text-based selectors unstable on checkout flows",
      "framework": "playwright",
      "failureRate": 0.37,
      "recommendedStrategy": "prefer data-testid"
    }
  ]
}
```

---

## What ACIN Improves

### Better contract generation

Repo intelligence can recommend stronger contract defaults based on historical outcomes.

Examples:

- prefer `data-testid` for transactional forms
- prefer semantic role selectors for login flows
- avoid text selectors in multi-language navigation

### Better contract evolution

The Contract Evolution Advisor becomes smarter because it can compare current repo behavior against broader historical patterns.

### Better breakage prediction

The UI Change Prediction Engine becomes stronger because it can say not only _what changed_, but also _how often this class of change historically breaks automation_.

### Better enterprise reporting

MindTrace can produce quality and risk scoring at:

- repo level
- suite level
- contract level
- team level
- organization level

---

## ACIN Privacy Modes

### Offline mode

Signals remain local to the customer environment.

### Network mode

Signals are anonymized and contributed to the global intelligence layer.

### Hybrid mode

Only allowlisted signal types leave the customer environment.

---

## Phase 6 Monetization Alignment

ACIN directly supports monetizable enterprise products:

### Automation Intelligence Dashboard

Show:

- unstable selector patterns
- fragile flows
- framework reliability trends
- automation maturity metrics

### Contract Quality Score

Example:

```json
{
  "contractQualityScore": 0.87,
  "riskLevel": "medium",
  "improvementAreas": ["replace css selectors with testids"]
}
```

### Enterprise Benchmarking

Examples:

- your selector stability vs industry benchmark
- your automation resilience by framework
- your release breakage risk trend

### Release Risk Forecasting

Examples:

- predicted automation instability before release
- top high-risk flows for tonight's CI
- contract drift hotspots

This turns MindTrace into a platform category that is much harder to copy.

---

# 2. Governance Safety Layer (GSL)

## What It Is

The Governance Safety Layer is the final enterprise-grade protection system that prevents:

- silent AI corruption
- unsafe healing behavior
- stale cache usage
- contract drift abuse
- schema drift
- artifact tampering
- unauthorized write paths
- hidden execution mutation

Its job is simple:

**Nothing changes automation authority silently.**

## Why It Matters

Enterprise-grade systems fail when:

- an AI suggestion becomes an implicit runtime decision
- a stale cache influences healing
- a contract changes without revalidation
- artifacts are overwritten or partially rewritten
- incompatible versions load without detection
- hidden side effects alter execution outcomes

GSL prevents this.

---

## Core Safety Principle

Every automation decision must be attributable to one of these authorities only:

1. **Contract authority**
2. **Governance authority**
3. **Deterministic runtime rules**
4. **Explicit human approval**

Nothing else.

Not AI.
Not heuristic mutation.
Not stale artifacts.
Not implicit fallback drift.

---

## GSL Enforcement Domains

### 1. Contract integrity gate

Before execution, verify:

- `.mcp-contract/` exists
- required files exist
- schema validation passes
- fingerprint matches canonical bundle
- version compatibility is valid

If not, fail hard.

### 2. Cache integrity gate

Before any cache-aware healing or prediction:

- `.mcp-cache/` schema valid
- `cache.contractSha256` matches current contract fingerprint
- cache version compatible
- cache not partially missing required entries

If not, cache is invalid.

### 3. Authority boundary gate

Enforce at runtime:

- runtime cannot write to `.mcp-contract/`
- runtime cannot write to `.mcp-cache/`
- Claude Skills cannot write to `.mcp-contract/`
- Claude Skills cannot write to `.mcp-cache/`
- AI cannot alter governance outcomes
- AI cannot mark test pass/fail
- healing engine cannot mutate contract

### 4. Artifact tamper gate

For run-local artifacts:

- required artifacts must exist
- artifact schemas must validate
- append-only files must remain append-only
- overwrite attempts must be rejected unless explicitly allowed
- policy artifacts must be written before healing continues

### 5. Drift safety gate

When contract fingerprint changes:

- invalidate dependent cache
- require explicit regeneration
- record drift event in immutable audit
- block unsafe reuse of previous intelligence artifacts where necessary

### 6. AI safety gate

AI/Claude Skills may only produce:

- summaries
- explanations
- suggestions
- proposal artifacts
- risk forecasts

They may not produce:

- execution authority
- contract mutations
- cache mutations
- governance overrides
- pass/fail decisions

---

## Suggested GSL Artifacts

Suggested run-local artifacts:

- `policy-decision.json`
- `runtime-contract-context.json`
- `governance-safety-report.json`
- `drift-integrity-report.json`
- `authority-boundary-report.json`

### Example governance safety report

```json
{
  "contractIntegrity": "pass",
  "cacheIntegrity": "pass",
  "authorityBoundary": "pass",
  "aiSafety": "pass",
  "driftStatus": "valid",
  "result": "safe-to-execute"
}
```

---

## Failure Behavior

### Hard-fail conditions

These should result in policy/compliance failure behavior:

- contract fingerprint mismatch
- missing required contract files
- invalid schema
- stale cache used as authoritative input
- AI attempt to mutate contract/cache
- unauthorized write path
- invalid artifact ordering
- incompatible schema version

### Recommended exit behavior

Use existing MindTrace exit semantics:

- `0` success
- `1` test failure
- `2` infra/runtime failure
- `3` policy/compliance violation

GSL violations belong under **exit code 3** whenever they represent authority or integrity failure.

---

## Enterprise-Grade Outcome

With GSL in place, MindTrace becomes safer at enterprise scale because:

- AI cannot silently corrupt automation
- healing cannot quietly become authority
- contract drift cannot poison execution
- stale cache cannot influence results
- artifacts remain auditable
- decisions remain attributable

That is the difference between a clever test framework and a platform trusted by companies like Stripe or Datadog.

---

# 3. How To Add This To the Master MD File

## Recommended placement

Add a new section **after the current authority/governance sections** and before later monetization strategy details.

### Best insertion points

#### Option A — preferred

Add immediately after:

- `# AUTHORITY MODEL (WHO WRITES WHAT)`

New sections:

- `# AUTOMATION CONTRACT INTELLIGENCE NETWORK (ACIN)`
- `# GOVERNANCE SAFETY LAYER (GSL)`

This is the cleanest place because both ACIN and GSL are architectural governance extensions.

#### Option B — also valid

Add after the current Phase 5 / Phase 6 intelligence discussion, if you want them framed as advanced platform capabilities.

But Option A is stronger because:

- GSL is not optional strategy; it is core enterprise safety
- ACIN depends on strong authority boundaries
- it keeps the master architecture coherent

---

## Suggested master-doc anchor layout

```md
# AUTHORITY MODEL (WHO WRITES WHAT)

...existing content...

# AUTOMATION CONTRACT INTELLIGENCE NETWORK (ACIN)

...new ACIN content...

# GOVERNANCE SAFETY LAYER (GSL)

...new GSL content...

# VERSIONING + COMPATIBILITY POLICY

...existing content continues...
```

That is the best place if you want the master file to remain the single architectural source of truth.

---

# 4. Final Recommendation

If you want the cleanest structure:

- keep this file as a standalone strategic addendum now
- then merge the two major sections into the master architecture file under the authority model section

That gives you:

- one master canonical architecture
- one focused addendum for planning/review
- zero ambiguity about where ACIN and GSL belong

---

# 5. Final Strategic Position

With ACIN + GSL added, MindTrace becomes:

- deterministic automation platform
- contract-governed execution system
- governance-enforced healing engine
- AI-assisted intelligence layer
- contract-learning automation platform
- predictive release-risk system
- enterprise-grade automation integrity platform

That is an architecture category far beyond Playwright, Cypress, or Selenium alone.

---

# VERSIONING + COMPATIBILITY POLICY

## 2.1 Schema Versioning

All contract + cache files MUST contain:

```json
"schema_version": "<major>.<minor>.<patch>"
```

### Breaking Changes (MAJOR)

- run layout changes
- required artifact names change
- exit code semantics change
- contract key structure changes

### Non-breaking (MINOR)

- additional optional fields
- new evidence categories
- new adapter capabilities

### Patch

- validation logic improvements
- metadata clarifications

## 2.2 Runtime Compatibility Loading

Runtime MUST:

- read `contract.schema_version == N` (current)
- read `contract.schema_version == N-1` (backward compatible)
- treat `N-2` as unsupported unless governance allows
- log version mismatch as warning, not fatal

## 2.3 Cache Invalidation Rules

Cache validity: `meta.contract_hash == contract.fingerprint.sha256`

If mismatch:

- Cache is INVALID
- Runtime continues (non-fatal)
- Governance may escalate
- Next build triggers rebuild

### Rebuild Triggers

- contract hash change
- schema_version major bump
- framework style change
- selector-strategy change
- assertion-style change

---

# EVIDENCE MODEL (TRUST + DEBUG)

Every inferred field in:

- `framework-pattern.json`
- `selector-strategy.json`
- `assertion-style.json`
- `automation-contract.json`

MUST include evidence array:

```json
"evidence": [
  {
    "kind": "config|dependency|wrapper|pattern|signal",
    "file": "relative/path/to/evidence",
    "sample": "optional code snippet"
  }
]
```

Evidence required for:

- framework detection
- style detection
- architecture inference
- locator strategy detection
- assertion style detection

---

# FAILURE TAXONOMY + HEALABILITY

## Standard Categories

| Category        | Healable | Immediate Fail | Authority                   |
| --------------- | -------- | -------------- | --------------------------- |
| selectorMissing | ✅       | ❌             | Contract → Cache → Fallback |
| elementDetached | ✅       | ❌             | Retry + Cache               |
| timeout         | ⚠️       | policy         | Policy-dependent            |
| assertion       | ❌       | ✅             | Not healable                |
| network4xx      | ❌       | ✅             | Not healable                |
| environment     | ❌       | ✅             | Not healable                |
| flake           | ✅       | ❌             | Deterministic retry         |

## Healing Authority

Healing Engine MAY:

- Attempt selector recovery using contract strategy
- Attempt semantic match using page cache
- Apply last-known-good selector
- Use deterministic fallback

Healing Engine MUST NOT:

- Alter test assertions
- Override governance policy
- Write to contract/cache
- Make autonomous decisions outside healing scope

---

# SECURITY + PRIVACY DEFAULTS

## Repository Scan Redaction Rules (Claude Enhancement)

Repo scanning MUST classify files as:

### SKIP (do not process or store)

- `.env`, `.env.local`, `.env.*.local`
- SSH keys: `*id_rsa*`, `*id_dsa*`, `*id_ecdsa*`, `*id_ed25519*`
- Certificates: `*.pem`, `*.p12`, `*.pfx`, `*.key`
- Secret managers: `secrets.*`, `credentials.*`, `.aws/credentials`

### HASH ONLY (compute SHA256, store hash, discard content)

- Files matching SKIP patterns
- Sensitive binaries from secret paths

### PROCESS WITH REDACTION (store evidence snippets with truncation)

- Code files with potential secrets (truncate to 50 chars before/after match)
- Config files with API key patterns (redact values, keep structure)
- Package lock files (preserve names, redact sensitive versions)

### PROCESS NORMALLY

- Source code, tests, documentation
- Non-sensitive package.json, tsconfig.json
- Framework detection files

### General Rules

- Redact secrets from all artifacts (API tokens, etc.)
- Allowlist audit fields (no PII in contract/cache)
- No source code in evidence samples (only patterns)
- No credentials in run-request.json

## Cross-Repo Safety

If/when a platform coordinates Dev/UI repo + Automation repo:

- MindTrace core tools receive both roots explicitly (no auto-discovery)
- PR creation requires separate "platform agent" with scoped credentials
- MindTrace core emits **patch artifact** rather than pushing directly

---

# PHASE 0 — CONTRACT LOCK (BUILD OR HARDEN)

## Phase 0 Schema Registry (Normative - ChatGPT Enhancement)

**Schemas live at:** `repo-intelligence-mcp/src/schemas/`

### Fingerprinted Contract Files (7 required)

| File                       | Schema Location                   | Purpose             |
| -------------------------- | --------------------------------- | ------------------- |
| `repo-topology.json`       | `repo-topology.schema.json`       | Repo structure      |
| `framework-pattern.json`   | `framework-pattern.schema.json`   | Framework detection |
| `selector-strategy.json`   | `selector-strategy.schema.json`   | Locator strategy    |
| `assertion-style.json`     | `assertion-style.schema.json`     | Assertion patterns  |
| `wrapper-discovery.json`   | `wrapper-discovery.schema.json`   | Wrapper detection   |
| `automation-contract.json` | `automation-contract.schema.json` | Core contract       |
| `page-key-policy.json`     | `page-key-policy.schema.json`     | Page identity       |

### Non-Fingerprinted File

- `contract.meta.json` → `contract-meta.schema.json` (timestamps only; excluded from hash)

### Commit Marker

- `automation-contract.hash` (sha256 over canonical JSON of fingerprinted set; filename-bound)

---

## Fingerprint Algorithm (Normative - Claude Enhancement)

For each file in `FINGERPRINT_FILES` (sorted lexicographically):

```
1. hasher.update("<filename>\n")
2. parsed = JSON.parse(readFile(filename))
3. canonical = canonicalStringify(parsed)  // deep key sort, preserve arrays
4. hasher.update("<canonical-json>\n")

Output: hex digest written atomically
Write: *.tmp.<uuid> → rename to automation-contract.hash with newline
```

### Test Case Example

Given files in `.mindtrace/contracts/`:

```
assertion-style.json
automation-contract.json
framework-pattern.json
page-key-policy.json
repo-topology.json
selector-strategy.json
wrapper-discovery.json
```

Computation produces:

```
a3f7e2d1c8b9f4a6e5d2c1b8a9f0e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1
```

---

## Validation Gate (Normative - Claude Enhancement)

A Phase 0 bundle is **valid** iff:

- ✅ All required files exist (7 + meta + hash)
- ✅ Each JSON validates against its schema via AJV
- ✅ `computeContractFingerprint(strict)` equals stored hash
- ✅ All `automation-contract.json.refs.*Ref` paths exist and are POSIX

### Test Cases

**PASS:**

```
✅ All 8 files present
✅ All JSON validates against schema
✅ Fingerprint matches stored hash
✅ All refs are POSIX relative
```

**FAIL (Missing file):**

```
❌ automation-contract.json exists but framework-pattern.json missing
→ Exit: compliance invalid (3)
```

**FAIL (Schema invalid):**

```
❌ assertion-style.json fails AJV validation
→ Exit: compliance invalid (3)
→ Log: AJV error details
```

**FAIL (Fingerprint mismatch):**

```
❌ Computed: a3f7e2d1...
❌ Stored:   7d4c3b2a...
→ Exit: compliance invalid (3)
→ Log: "Contract integrity check failed"
```

---

## Phase 0 Structure

Must ADD to `.mindtrace/contracts/`:

```
automation-contract.json
page-key-policy.json
contract.meta.json
contract.fingerprint.sha256
repo-topology.json
framework-pattern.json
selector-strategy.json
assertion-style.json
wrapper-discovery.json
```

## automation-contract.json Fields

- schema_version
- framework
- stylesDetected
- primaryStyle
- architecture
- entrypoints
- paths{}
- page_identity{}
- refs{}
- generated_by{}
- evidence[]

---

# PHASE 1 — SEMANTIC PAGE CACHE (V1)

```
.mcp-cache/v1/
  meta.json
  pages/<pageKey>.json
```

## meta.json

```json
{
  "schema_version": "1.0.0",
  "contract_hash": "<sha256>",
  "created_at": "ISO8601",
  "pages_count": 42,
  "cache_format": "semantic-v1"
}
```

## Each page MUST include

- pageKey
- style
- semanticRoles
- labels
- stableIds
- anchors
- interactionTargets[]
- locatorCandidates[]
- contract_hash
- confidence (0.0-1.0)

**Cache validity:** `meta.contract_hash == contract.fingerprint.sha256`

---

# PHASE 2.0 — CONTRACT-AWARENESS MODULE (NEW, ADDITIVE)

**Goal:** Introduce a deterministic, runtime-safe **Contract Awareness** layer that loads + validates Phase 0 artifacts, binds Phase 1 cache, and exposes a **Strategy Context** used by runtime execution, healing, and cross-repo diff tooling.

This module is **read-only** with respect to:

- `.mcp-contract/*` (contracts)
- `.mcp-cache/*` (cache)

It **may write only** run-local artifacts under:

- `runs/<runId>/artifacts/phase2/` (or `runs/<runId>/artifacts/runtime/` if you keep the existing naming)

## 2.0.1 Core Responsibilities (MindTrace Core)

1. **Load Contract Bundle**
   - Locate `contractDir` (default: `<repoRoot>/.mcp-contract/`)
   - Ensure required Phase 0 files exist
   - Validate each JSON against AJV schemas
   - Verify fingerprint integrity (`automation-contract.hash`) in `strict` mode

2. **Bind Page Cache**
   - Locate cache root (default: `<repoRoot>/.mcp-cache/v1/`)
   - Read `meta.json`
   - Enforce binding: `meta.contract_hash == contractHash`
   - If mismatch: mark cache invalid (non-fatal), emit warning

3. **Build Strategy Context**
   - Produce a single **contract-aware strategy object** for runtime + healing:
     - framework + architecture + style
     - selector preference order + risk rules
     - page identity policy + templates
     - entrypoints (style-aware)
     - assertion style summary
     - cache binding status
   - **No AI** is required for this stage.

4. **Write Runtime Context Artifact**
   - Emit `runtime-contract-context.json` (schema-validated) for auditing/debug.

## 2.0.2 What This Enables (Downstream Phases)

- **Phase 2 (Runtime Execution):** deterministic loading and policy context
- **Phase 3 (Healing):** selector ranking must follow strategy context order
- **Phase 4 (Adapters):** adapters consume strategy context (not raw DOM guesses)
- **Phase X (Cross-Repo):** diff/patch generator can map changes to page keys + strategy rules

## 2.0.3 Public API Surface (Deterministic)

**File:** `mindtrace-ai-runtime/src/contract-awareness/index.ts` (new module boundary)

Required functions (no network calls, no randomness):

- `loadContractBundle(params) -> LoadedContractBundle`
- `validateContractBundle(params) -> ContractValidationResult`
- `bindCache(params) -> CacheBindingResult`
- `buildStrategyContext(params) -> ContractStrategyContext`
- `writeRuntimeContractContext(params) -> void`

## 2.0.4 Error Taxonomy (Contract Awareness)

Contract-awareness errors are **COMPLIANCE** by default (exit code **3**) unless explicitly downgraded to a warning in `best_effort` mode.

| Code                     | Category | Default Severity | Typical Cause                           |
| ------------------------ | -------- | ---------------- | --------------------------------------- |
| `CA_MISSING_FILE`        | Contract | ERROR            | One of required Phase 0 files not found |
| `CA_SCHEMA_INVALID`      | Contract | ERROR            | AJV validation failed                   |
| `CA_HASH_MISMATCH`       | Contract | ERROR            | Stored hash != computed hash            |
| `CA_VERSION_UNSUPPORTED` | Contract | ERROR            | schema_version too old/new              |
| `CA_REF_MISSING`         | Contract | ERROR            | `refs.*Ref` points to missing file      |
| `CA_CACHE_META_MISSING`  | Cache    | WARN             | Cache meta missing (cache optional)     |
| `CA_CACHE_HASH_MISMATCH` | Cache    | WARN             | Cache hash != contract hash             |
| `CA_CACHE_READ_ERROR`    | Cache    | WARN             | Cache unreadable (permissions/parse)    |

**Exit Code Mapping (Normative):**

- Any `ERROR` in COMPLIANCE mode → **Exit 3** (compliance invalid)
- Runtime execution errors remain **Exit 2** (unchanged)

## 2.0.5 Acceptance Criteria (Contract Awareness)

### Determinism

- ✅ Same repo + same contract files → same computed hash
- ✅ Same contract + same cache meta → same `cache.valid` result
- ✅ Output `runtime-contract-context.json` is stable (ordering + fields)

### Integrity

- ✅ In `strict` mode: missing/invalid contract bundle → Exit 3 before runtime starts
- ✅ In `best_effort` mode: cache mismatch is warning only (runtime continues)

### Authority Boundaries

- ✅ Module never writes to `.mcp-contract/*` or `.mcp-cache/*`
- ✅ Module writes only under `runs/<runId>/artifacts/**`

### Observability

- ✅ Always emits `runtime-contract-context.json` with:
  - loaded contract hash
  - schema versions
  - cache binding status
  - warnings/errors (redacted, no secrets)

# PHASE 2 — RUNTIME CONTRACT EXECUTION

Runtime MUST:

- Load `.mindtrace/contracts/automation-contract.json`
- Validate schema_version compatibility
- Load `.mcp-cache/v1/*` (if contract_hash matches)
- Write `runs/<runName>/artifacts/runtime-contract-context.json`

## runtime-contract-context.json

```json
{
  "schema_version": "1.0.0",
  "runId": "<runName>",
  "contract": {
    "hash": "<loaded hash>",
    "schema_version": "<version>",
    "framework": "<detected>"
  },
  "cache": {
    "valid": true|false,
    "hash_match": true|false,
    "pages_loaded": 42
  },
  "warnings": []
}
```

Failure to find contract/cache is **NON-FATAL** (logging only).

---

# PHASE 3 — HEALING ENGINE UPGRADE

Selector ranking order:

1. Contract locator strategy (primary authority)
2. Semantic page cache (high confidence)
3. Last-known-good (historical fallback)
4. Deterministic fallback (guaranteed coverage)
5. LLM-assisted ranking (advisory only)

LLM NEVER:

- overrides governance policy
- mutates contract
- writes to cache
- claims authority

---

# PHASE 4 — CROSS FRAMEWORK ADAPTER

Scope:

### IN (supported)

- locator syntaxes
- assertion patterns
- fixture definitions
- hook patterns
- navigation methods
- wait strategies

### OUT (MVP excluded)

- custom reporters
- plugin APIs
- task executors

**Contract-driven mapping only** (no LLM-based adaptation).

---

# PHASE 5 — RUNTIME LEARNING LOOP

On successful heal:

- Update contract confidence score (+0.05)
- Update page interaction score

Append to `history/run-index.jsonl`:

```json
{
  "timestamp": "ISO8601",
  "runId": "<id>",
  "page_key": "<key>",
  "interaction": "<type>",
  "strategy_used": "<strategy>",
  "confidence_delta": 0.05,
  "success": true|false,
  "evidence": {}
}
```

---

# AI Assistive Layer (Claude Skills)

See: `claude-skills-integration.md`

---

# PHASE 6 — ENTERPRISE LAYER

CLI commands:

```
mindtrace phase0              # Generate contract bundle
mindtrace phase1              # Build page cache v1
mindtrace run                 # Execute under contract
mindtrace adapt               # Cross-framework adapter
mindtrace cross-repo          # Cross-repo compare
mindtrace validate            # Pre-flight validation
```

---

# VALIDATOR GATE (Pre-Run CI)

Before runtime execution, CI MUST:

- ✅ run Contract Awareness validation gate (schemas + fingerprint + refs) before any runtime/healing
- ✅ validate contract schema (against schema_version)
- ✅ verify contract hash integrity
- ✅ validate cache meta binding
- ✅ check for required artifact names
- ✅ validate run layout structure

On failure:

- Exit code 3 (compliance invalid)
- Log validation errors
- Do not proceed to runtime

---

# CROSS-REPO SCENARIO (Phase X Add-On)

## Actors

- **Repo A (Dev/UI Repo)**: UI changes; may contain UI package (e.g., `ABD-UI`)
- **Repo B (Automation Suite)**: Tests + self-healing cache (e.g., `healingLocators/**/*.json`)
- **MindTrace Core**: Deterministic engine (contracts, diff, governance)
- **Future Visual Platform**: Customer UI for repo linking, approvals, PR publishing

## Responsibilities

**MindTrace Core:**

1. Receive run request (Repo A + Repo B + policies)
2. Scan Repo A and extract UI-touching change surface
3. If UI package missing → clean exit (uiPackageFound=false)
4. If UI package exists → run Phase 0 contract generation
5. Scan Repo B → detect framework, locate cache roots
6. Cross-repo compare → deterministic `cross-repo-diff.json`
7. Emit PR package (no network calls):
   - `automation-repo.patch`
   - `pr-summary.md`
   - `pr-metadata.json`

**Future Visual Platform:**

1. Customer configures Repo A + Repo B + policies
2. Platform triggers Core MindTrace run
3. Platform displays diff summary + confidence
4. Platform publishes PR (using Git provider API)
5. Platform stores audit logs

---

# PATCH ARTIFACT SCHEMA (Claude Enhancement)

**File:** `runs/<runId>/artifacts/phaseX/automation_patch.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "mindtrace://schemas/automation-patch.schema.json",
  "title": "MindTrace Automation Patch Artifact",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "targetRepoId", "baseBranch", "contractHash", "reason", "diffs"],
  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "e.g., 1.0.0"
    },
    "targetRepoId": {
      "type": "string",
      "description": "Repo B identifier (automation repo)"
    },
    "baseBranch": {
      "type": "string",
      "description": "Branch to merge into"
    },
    "contractHash": {
      "type": "string",
      "description": "Repo A contract hash (traceability)"
    },
    "reason": {
      "type": "string",
      "description": "Why patch is needed"
    },
    "diffs": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["filePath", "operation"],
        "properties": {
          "filePath": {
            "type": "string",
            "description": "Repo B relative path"
          },
          "operation": {
            "type": "string",
            "enum": ["create", "modify", "delete"]
          },
          "changes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "path": { "type": "string", "description": "JSON pointer" },
                "op": { "type": "string", "enum": ["add", "remove", "replace"] },
                "value": {}
              }
            }
          }
        }
      }
    }
  }
}
```

---

# CROSS-REPO INPUT SCHEMA

**File:** `runs/<runId>/inputs/run-request.json`

```json
{
  "runId": "unique-run-id",
  "repos": {
    "devRepo": {
      "name": "RepoA-DevUI",
      "ref": "main",
      "checkoutPath": "/absolute/path"
    },
    "automationRepo": {
      "name": "RepoB-Automation",
      "ref": "main",
      "checkoutPath": "/absolute/path"
    }
  },
  "policies": {
    "uiPackageFilter": {
      "enabled": true,
      "packageName": "ABD-UI"
    },
    "locatorCachePolicy": {
      "cacheRoots": ["healingLocators"],
      "fileGlobs": ["**/*.json"],
      "format": "healingLocators-v1"
    },
    "ignore": {
      "useDefault": true,
      "patterns": []
    },
    "mode": "best_effort"
  }
}
```

---

# CROSS-REPO OUTPUT SCHEMA

**File:** `runs/<runId>/artifacts/cross-repo-diff.json`

```json
{
  "schema_version": "1.0.0",
  "runId": "<id>",
  "repoA": { "name": "...", "ref": "..." },
  "repoB": { "name": "...", "ref": "..." },
  "contractHash": "<sha256>",
  "summary": {
    "uiPackageFound": boolean,
    "filesChanged": number,
    "locatorKeysImpacted": number,
    "proposalCount": number
  },
  "impacts": [
    {
      "pageKey": "...",
      "style": "...",
      "reason": "...",
      "confidence": 0.0-1.0
    }
  ],
  "proposals": [
    {
      "targetFile": "...",
      "op": "add|remove|replace",
      "path": "...",
      "value": {},
      "evidence": [
        {
          "kind": "diff|contract|cache|signal",
          "file": "...",
          "sample": "optional"
        }
      ]
    }
  ]
}
```

---

# PR METADATA SCHEMA

**File:** `runs/<runId>/artifacts/pr-metadata.json`

```json
{
  "title": "Update locators for Repo A UI changes",
  "body": "Automated PR generated by MindTrace cross-repo compare",
  "labels": ["automation", "mindtrace"],
  "branchName": "mindtrace/patch-<runId>",
  "baseBranch": "main",
  "draft": true
}
```

---

# SECURITY REDACTION ALGORITHM (NORMATIVE)

This redaction policy is **deterministic**, **audit-friendly**, and designed to prevent secrets/PII from being stored in `runs/*` artifacts or emitted in PR bodies.

## Redaction Categories

Each scanned file path is assigned **exactly one** category:

| Category  | Meaning                                                                  | Allowed to read bytes? | Written to artifacts?                       |
| --------- | ------------------------------------------------------------------------ | ---------------------: | ------------------------------------------- |
| `SKIP`    | Do not open file; treat as opaque/binary/irrelevant                      |                     ❌ | ❌ (only record path + reason)              |
| `HASH`    | You may open + hash bytes, but never persist content                     |         ✅ (hash only) | ✅ (sha256 digest + size)                   |
| `PROCESS` | You may parse content, but must redact sensitive spans before persisting |                     ✅ | ✅ (redacted text / extracted signals only) |
| `NORMAL`  | Safe to store content excerpts (still size-limited)                      |                     ✅ | ✅ (excerpt-limited)                        |

## Deterministic Classification Rules

Classification is based on **POSIX-normalized repo-relative path** and (optionally) file size:

### Rule 1 — Always `SKIP` (binary/media/archives)

If filename matches:

- `\.(zip|tgz|gz|7z|rar)$`
- `\.(pdf|png|jpg|jpeg|webp)$`
- `\.(mp4|mov|mxf)$`
- `\.(exe|dll|dylib|so|bin)$`

→ category = `SKIP`, reason = `binary_or_archive`

### Rule 2 — `HASH` (potential secret containers / large files)

If path matches any of:

- `(^|/)\.env($|\.)`
- `(^|/)\.npmrc$`
- `(^|/)\.pypirc$`
- `(^|/)id_rsa$|(^|/)id_ed25519$|(^|/)\.ssh/`
- `(^|/)secrets?(/|$)`
- `(^|/)credentials?(/|$)`
- `(^|/)key(s)?(/|$)`
- or file size > **1MB**

→ category = `HASH`, reason = `secret_or_large`

### Rule 3 — `PROCESS` (config/code that may contain tokens)

If extension is one of:

- `.js .ts .tsx .jsx .py .java .go .rb .php .cs`
- `.json .yaml .yml .toml .ini .cfg`
- `.md .txt`

AND it matches any token-like patterns (case-insensitive):

- `api[_-]?key`
- `secret`
- `token`
- `authorization`
- `bearer\s+`
- `password`
- `private[_-]?key`

→ category = `PROCESS`, reason = `possible_secrets`

### Rule 4 — Otherwise `NORMAL`

Default category = `NORMAL`.

## Redaction Transform (for `PROCESS`)

When a file is `PROCESS`, MindTrace MUST apply these transforms before any content is written to disk:

1. **Line-based redaction** (replace value, keep key)
   - `API_KEY=...` → `API_KEY=[REDACTED]`
   - `"token": "..."` → `"token": "[REDACTED]"`

2. **Bearer token redaction**
   - `Authorization: Bearer <...>` → `Authorization: Bearer [REDACTED]`

3. **Private key block redaction**
   - `-----BEGIN ... PRIVATE KEY-----` block → `[REDACTED_PRIVATE_KEY_BLOCK]`

4. **Entropy guard** (normative)
   - Detect high-entropy token-like substrings and redact them deterministically.
   - A substring is **HIGH_ENTROPY** if:
     - `len >= 20`, AND
     - charset is token-like (`[A-Za-z0-9+/=_-]`), AND
     - Shannon entropy **H >= 4.0 bits/char** (computed over the substring), AND
     - (optional hardener) it matches a known token prefix OR is adjacent to a secret-key keyword (see patterns below).
   - Replace with `[REDACTED_HIGH_ENTROPY]`.

### Token & Secret Patterns (normative)

These patterns are used by the redaction classifier and the PROCESS transform. If any match occurs, redact value portions but preserve keys/structure.

**Cloud / vendor tokens**

- AWS Access Key ID: `\b(AKIA|ASIA)[0-9A-Z]{16}\b`
- GitHub token: `\bgh[opsu]_[A-Za-z0-9_]{20,}\b`
- Slack token: `\bxox[baprs]-\d+-\d+-[A-Za-z0-9-]+\b`
- Google API key: `\bAIza[0-9A-Za-z\-_]{35}\b`

**Generic secrets / auth headers**

- Bearer token header: `(?i)authorization\s*:\s*bearer\s+[^\s]+`
- Basic auth header: `(?i)authorization\s*:\s*basic\s+[^\s]+`
- Private key blocks: `-----BEGIN ([A-Z ]+)?PRIVATE KEY-----[\s\S]*?-----END ([A-Z ]+)?PRIVATE KEY-----`

**Secret-ish key names (line- or JSON-based)**

- `(?i)(api[_-]?key|secret|token|password|passphrase|private[_-]?key|client[_-]?secret)\s*[:=]\s*[^\s]+`

> Entropy threshold note: `H >= 4.0` is a practical default for detecting random-looking tokens while avoiding many false positives. You can tighten to `H >= 4.2` if you see too many redactions on code-like strings.

**Important:** Redaction MUST be deterministic and MUST NOT depend on time, randomness, or network calls.

## Artifact Writing Rules (applies to `runs/<runName>/artifacts/*`)

- `SKIP`: write only `{ path, category, reason }`
- `HASH`: write `{ path, category, sha256, bytes }`
- `PROCESS`: write `{ path, category, redacted_excerpt (<= 8KB), extracted_signals }`
- `NORMAL`: write `{ path, category, excerpt (<= 8KB) }`

## Pseudocode (Reference)

```ts
function classify(pathPosix: string, bytes?: number): Category { ... }
function redact(text: string): string { ... }

switch (category) {
  case "SKIP":   persistMetaOnly(); break;
  case "HASH":   persistHashOnly(); break;
  case "PROCESS": persist(redact(readText())); break;
  case "NORMAL": persist(limit(readText())); break;
}
```

---

# APPENDIX: EXAMPLE SCHEMAS (DEVELOPER-READY)

These are reference schemas (trimmed) for implementers. Source of truth remains `/repo-intelligence-mcp/src/schemas/*` (Phase 0) and `/mindtrace-ai-runtime/src/schemas/*` (runtime artifacts).

## 1) run.manifest.schema.json (reference)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "mindtrace://schemas/run.manifest.schema.json",
  "title": "MindTrace Run Manifest",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "run_id", "phase", "inputs", "outputs"],
  "properties": {
    "schema_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "run_id": { "type": "string" },
    "phase": {
      "type": "string",
      "enum": ["phase0", "phase1", "phase2", "phase3", "phase4", "phase5", "phase6"]
    },

    "status": {
      "type": "string",
      "enum": ["started", "succeeded", "failed", "skipped"]
    },

    "timestamps": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "started_at": { "type": "string", "format": "date-time" },
        "finished_at": { "type": "string", "format": "date-time" }
      }
    },

    "policies": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "redaction_mode": { "type": "string", "enum": ["strict", "standard", "off"] },
        "fingerprint_mode": { "type": "string", "enum": ["strict", "best_effort"] },
        "max_artifact_bytes": { "type": "integer", "minimum": 0 }
      }
    },

    "inputs": {
      "type": "object",
      "additionalProperties": false,
      "required": ["repo_root"],
      "properties": {
        "repo_root": { "type": "string", "description": "Absolute path to repo root (or workspace root in multi-repo mode)." },
        "repoA": { "type": "string", "description": "Optional: dev/UI repo identifier or URL." },
        "repoB": { "type": "string", "description": "Optional: automation suite repo identifier or URL." },
        "ui_packages": { "type": "array", "items": { "type": "string" } }
      }
    },

    "outputs": {
      "type": "object",
      "additionalProperties": false,
      "required": ["contractDir", "hash", "artifacts"],
      "properties": {
        "contractDir": { "type": "string" },
        "hash": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
        "artifacts": {
          "type": "object",
          "additionalProperties": false,
          "required": ["diffRef", "patchRef"],
          "properties": {
            "diffRef": { "type": "string" },
            "patchRef": { "type": "string" }
          }
        }
      }
    },

    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["code", "message"],
        "properties": {
          "code": { "type": "string" },
          "message": { "type": "string" },
          "details": {}
        }
      }
    }
  }
}
```

## 2) cross-repo.diff.schema.json (reference)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "mindtrace://schemas/cross-repo.diff.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "repoA", "repoB", "locatorChanges"],
  "properties": {
    "schema_version": { "type": "string" },
    "repoA": { "type": "object" },
    "repoB": { "type": "object" },
    "locatorChanges": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["pageKey", "before", "after", "confidence"],
        "properties": {
          "pageKey": { "type": "string" },
          "before": { "type": "object" },
          "after": { "type": "object" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    }
  }
}
```

## 3) automation_patch.schema.json (reference)

See the full normative schema in this document under **"Patch Artifact Schema"**. (It must be shipped as a real JSON Schema file in the runtime package.)

# ACCEPTANCE CRITERIA

### Determinism & Integrity

- ✅ Same inputs → same `cross-repo-diff.json` + patch contents
- ✅ All emitted JSON passes schema validation
- ✅ POSIX paths only; repo-relative in artifacts
- ✅ Outputs written atomically; commit markers last

### Correctness

- ✅ UI package missing → `uiPackageFound=false`, empty proposals
- ✅ No impacted keys → `proposalCount=0`
- ✅ Proposals exist → patch + pr-summary + pr-metadata produced

### Safety Boundaries

- ✅ Core tool does not publish PRs or require credentials
- ✅ PR publishing is done only by future platform

---

# ENTERPRISE GUARANTEES

System guarantees when fully implemented:

- ✅ **Deterministic contract bundle** (same inputs → same hash)
- ✅ **Schema-validated artifacts** (all outputs pass validation)
- ✅ **Stable exit codes** (0/1/2/3 unchanged)
- ✅ **Immutable audit trail** (append-only history)
- ✅ **Contract-aware healing** (respects strategy, not reactive)
- ✅ **Read-only runtime contract access** (no writes to contract/cache)
- ✅ **Backward compatible schema loading** (N and N-1 versions)
- ✅ **Evidence-based inference** (all decisions traceable)
- ✅ **Privacy & security defaults** (secrets redacted, PII excluded)
- ✅ **Authority boundaries enforced** (governance model locked)

---

**END OF SPECIFICATION**

**Master Build Status: ULTRA FINAL**

Ready for implementation with:

- ✅ Phase 0→6 architecture
- ✅ Governance boundaries (ChatGPT + Claude enhancements)
- ✅ Cross-repo scenario (fully specified)
- ✅ Normative contracts (fingerprint, validation, patch artifact)
- ✅ Security redaction rules (clarified)
- ✅ Test cases (validation gate examples)

## 4) automation-contract.example.json (reference instance)

```json
{
  "schema_version": "0.1.0",
  "contractVersion": "0.1.0",
  "framework": "playwright",
  "stylesDetected": ["style1-native", "style2-bdd", "style3-pom-bdd"],
  "primaryStyle": "style3-pom-bdd",
  "architecture": "hybrid",
  "entrypoints": [
    { "style": "style1-native", "entrypoint": "tests/**/*.spec.ts" },
    { "style": "style2-bdd", "entrypoint": "features/**/*.feature" },
    { "style": "style3-pom-bdd", "entrypoint": "tests/**/*.spec.ts" }
  ],
  "paths": {
    "root": ".",
    "contractDir": ".mcp-contract",
    "cacheDir": ".mcp-cache",
    "runsDir": "runs",
    "entrypoints": {
      "style1-native": ["tests"],
      "style2-bdd": ["features"],
      "style3-pom-bdd": ["tests"]
    },
    "pages": ["src/pages", "pages"],
    "steps": ["features/step_definitions"],
    "wrappers": ["src/support", "support"],
    "configs": {
      "playwright": ["playwright.config.ts"],
      "cypress": [],
      "selenium": []
    }
  },
  "refs": {
    "selectorStrategyRef": "./selector-strategy.json",
    "assertionStyleRef": "./assertion-style.json",
    "pageKeyPolicyRef": "./page-key-policy.json"
  },
  "page_identity": {
    "mode": "hybrid",
    "primary": "style3-pom-bdd",
    "ref": "./page-key-policy.json"
  },
  "generated_by": { "name": "repo-intelligence-mcp", "version": "0.1.0" },
  "evidence": [
    { "kind": "config", "file": "playwright.config.ts", "sample": "use: { baseURL: ... }" },
    { "kind": "dependency", "file": "package.json", "sample": ""@playwright/test"" }
  ]
}
```

---

# APPENDIX: PRODUCTION FILES (ADD THESE VERBATIM)

## File: mindtrace-ai-runtime/src/contract-awareness/types.ts

```ts
// mindtrace-ai-runtime/src/contract-awareness/types.ts
// Contract-Awareness: deterministic types used by runtime + governance.
// Additive-only: do not break existing artifact names or exit-code semantics.

export type FingerprintMode = "strict" | "best_effort";

export type ContractAwarenessMode = "COMPLIANCE" | "BEST_EFFORT";

export type ContractAwarenessSeverity = "ERROR" | "WARN";

export type ContractAwarenessErrorCode =
  | "CA_MISSING_FILE"
  | "CA_SCHEMA_INVALID"
  | "CA_HASH_MISMATCH"
  | "CA_VERSION_UNSUPPORTED"
  | "CA_REF_MISSING"
  | "CA_CACHE_META_MISSING"
  | "CA_CACHE_HASH_MISMATCH"
  | "CA_CACHE_READ_ERROR";

export type ContractAwarenessIssue = {
  code: ContractAwarenessErrorCode;
  severity: ContractAwarenessSeverity;
  message: string;
  file?: string; // repo-relative posix path when applicable
  details?: unknown; // redacted; never include secrets
};

export type ContractValidationResult = {
  ok: boolean;
  mode: ContractAwarenessMode;
  contractDir: string; // absolute path on disk
  fingerprintMode: FingerprintMode;
  storedHash?: string; // from automation-contract.hash
  computedHash?: string; // computed from fingerprinted set
  issues: ContractAwarenessIssue[];
  warnings: string[];
};

export type CacheBindingResult = {
  cacheDir?: string; // absolute, if present
  metaPath?: string; // absolute, if present
  valid: boolean;
  reason?: string;
  contractHash: string;
  cacheContractHash?: string;
  pagesLoaded?: number;
  issues: ContractAwarenessIssue[];
  warnings: string[];
};

// Minimal shapes we need from Phase 0 artifacts.
// Keep these permissive for backward compat; schema validation is the authority.

export type AutomationContractJSON = {
  schema_version: string;
  contractVersion?: string;
  framework: "cypress" | "playwright" | "selenium" | "unknown";
  stylesDetected: string[];
  primaryStyle: string;
  architecture: "native" | "pom" | "bdd" | "hybrid" | "unknown";
  entrypoints: Array<{ style: string; entrypoint: string; confidence?: number }>;
  paths?: Record<string, unknown>;
  refs: {
    selectorStrategyRef: string;
    assertionStyleRef: string;
    pageKeyPolicyRef: string;
  };
  page_identity: { mode: "hybrid" | "detected" | "hardcoded"; primary: string; ref: string };
  generated_by: { name: string; version: string };
  evidence?: Array<{ kind: string; file: string; sample?: string }>;
};

export type SelectorStrategyJSON = {
  contractVersion?: string;
  preferenceOrder?: string[];
  wrappers?: unknown[];
  riskRules?: {
    allowXPath?: boolean;
    cssLastResort?: boolean;
    requireStableIdsWhenAvailable?: boolean;
  };
  confidence?: number;
  repoSignals?: unknown[];
  evidence?: unknown[];
};

export type AssertionStyleJSON = {
  contractVersion?: string;
  primary?: string;
  wrappers?: string[];
  confidence?: number;
  repoSignals?: unknown[];
  evidence?: unknown[];
};

export type FrameworkPatternJSON = {
  contractVersion?: string;
  framework?: string;
  style?: string;
  confidence?: number;
  repoSignals?: unknown[];
  detectedPaths?: {
    tests?: string[];
    pages?: string[];
    steps?: string[];
    support?: string[];
  };
  evidence?: unknown[];
};

export type PageKeyPolicyJSON = {
  schema_version: string;
  mode: "hybrid" | "detected" | "hardcoded";
  patterns: Record<string, { template: string; confidence: number; source: "hardcoded" | "detected" }>;
  collision_resolution: "deterministic_suffix" | "error" | "warn";
  fallback_order: string[];
  dynamicFallback: boolean;
  evidence?: unknown[];
};

export type WrapperDiscoveryJSON = Record<string, unknown>;
export type RepoTopologyJSON = Record<string, unknown>;
export type ContractMetaJSON = Record<string, unknown>;

export type LoadedContractBundle = {
  contractDir: string; // absolute
  contractHash: string;
  automationContract: AutomationContractJSON;
  pageKeyPolicy: PageKeyPolicyJSON;
  selectorStrategy: SelectorStrategyJSON;
  assertionStyle: AssertionStyleJSON;
  frameworkPattern: FrameworkPatternJSON;
  wrapperDiscovery: WrapperDiscoveryJSON;
  repoTopology: RepoTopologyJSON;
  contractMeta?: ContractMetaJSON; // optional
};

export type ContractStrategyContext = {
  schema_version: "1.0.0";
  contractHash: string;

  framework: AutomationContractJSON["framework"];
  architecture: AutomationContractJSON["architecture"];
  primaryStyle: string;

  entrypoints: AutomationContractJSON["entrypoints"];

  selectorStrategy: {
    preferenceOrder: string[];
    riskRules: Required<NonNullable<SelectorStrategyJSON["riskRules"]>>;
  };

  pageIdentity: {
    mode: PageKeyPolicyJSON["mode"];
    patterns: PageKeyPolicyJSON["patterns"];
    collisionResolution: PageKeyPolicyJSON["collision_resolution"];
    fallbackOrder: PageKeyPolicyJSON["fallback_order"];
    dynamicFallback: PageKeyPolicyJSON["dynamicFallback"];
  };

  assertionStyle: {
    primary: string;
    wrappers: string[];
  };

  cache: {
    valid: boolean;
    cacheDir?: string;
    cacheContractHash?: string;
    pagesLoaded?: number;
  };

  // Deterministic ranking order for Phase 3+ (must be respected)
  selectorRankingOrder: Array<"contract_strategy" | "semantic_cache" | "last_known_good" | "deterministic_fallback" | "llm_advisory">;

  warnings: string[];
};

export type RuntimeContractContextArtifact = {
  schema_version: "1.0.0";
  runId: string;

  contract: {
    dir: string;
    hash: string;
    schema_version: string;
    framework: string;
  };

  cache: {
    valid: boolean;
    hash_match: boolean;
    cache_dir?: string;
    cache_hash?: string;
    pages_loaded?: number;
  };

  issues: ContractAwarenessIssue[];
  warnings: string[];
};
```

## File: mindtrace-ai-runtime/src/contract-awareness/errors.ts

```ts
// mindtrace-ai-runtime/src/contract-awareness/errors.ts
// Centralized error taxonomy for contract-awareness. Deterministic & audit-safe.

import type { ContractAwarenessErrorCode, ContractAwarenessIssue, ContractAwarenessSeverity } from "./types.js";

export class ContractAwarenessError extends Error {
  public readonly code: ContractAwarenessErrorCode;
  public readonly severity: ContractAwarenessSeverity;
  public readonly file?: string;
  public readonly details?: unknown;

  constructor(params: { code: ContractAwarenessErrorCode; severity: ContractAwarenessSeverity; message: string; file?: string; details?: unknown }) {
    super(params.message);
    this.name = "ContractAwarenessError";
    this.code = params.code;
    this.severity = params.severity;
    this.file = params.file;
    this.details = params.details;
  }

  toIssue(): ContractAwarenessIssue {
    return {
      code: this.code,
      severity: this.severity,
      message: this.message,
      file: this.file,
      details: this.details
    };
  }
}

// Factory helpers (keep callers simple and consistent)

export const CA = {
  missingFile: (file: string, message?: string) =>
    new ContractAwarenessError({
      code: "CA_MISSING_FILE",
      severity: "ERROR",
      message: message ?? `Required contract file missing: ${file}`,
      file
    }),

  schemaInvalid: (file: string, ajvErrors: unknown) =>
    new ContractAwarenessError({
      code: "CA_SCHEMA_INVALID",
      severity: "ERROR",
      message: `Schema validation failed: ${file}`,
      file,
      details: ajvErrors
    }),

  hashMismatch: (storedHash: string, computedHash: string) =>
    new ContractAwarenessError({
      code: "CA_HASH_MISMATCH",
      severity: "ERROR",
      message: `Contract hash mismatch (stored != computed)`,
      details: { storedHash, computedHash }
    }),

  versionUnsupported: (file: string, schemaVersion: string, supported: string[]) =>
    new ContractAwarenessError({
      code: "CA_VERSION_UNSUPPORTED",
      severity: "ERROR",
      message: `Unsupported schema_version for ${file}: ${schemaVersion}`,
      file,
      details: { supported }
    }),

  refMissing: (ref: string) =>
    new ContractAwarenessError({
      code: "CA_REF_MISSING",
      severity: "ERROR",
      message: `Contract ref points to missing file: ${ref}`,
      file: ref
    }),

  cacheMetaMissing: (metaPath: string) =>
    new ContractAwarenessError({
      code: "CA_CACHE_META_MISSING",
      severity: "WARN",
      message: `Cache meta.json missing: ${metaPath}`,
      file: metaPath
    }),

  cacheHashMismatch: (cacheHash: string, contractHash: string) =>
    new ContractAwarenessError({
      code: "CA_CACHE_HASH_MISMATCH",
      severity: "WARN",
      message: `Cache hash mismatch (cache != contract)`,
      details: { cacheHash, contractHash }
    }),

  cacheReadError: (file: string, err: unknown) =>
    new ContractAwarenessError({
      code: "CA_CACHE_READ_ERROR",
      severity: "WARN",
      message: `Cache read error: ${file}`,
      file,
      details: err
    })
};
```
