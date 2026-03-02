# Claude Code — Master Build Prompt

## MindTrace: Phase 0 → Phase 6 (Full System, Additive Only)

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
- Required runtime artifacts:
  - playwright-report.json
  - normalized-results.json
  - policy-decision.json
  - gate-summary.json
  - artifact-validation.json
  - healed-selectors.json
  - execution-trace-map.json
  - failure-narrative.md
  - root-cause-summary.json

## Governance MCP

- Schema validation
- Deterministic CI exit codes:
  - 0 pass
  - 1 fail
  - 2 runtime error
  - 3 compliance invalid

## Repo Intelligence MCP (Partial Phase 0 already built)

Already generates:

```
.mcp-contract/
  automation-contract.md
  repo-topology.json
  framework-pattern.json
  selector-strategy.json
  assertion-style.json
  wrapper-discovery.json
  phase0-summary.json
```

## Page Cache Builder (Partial Phase 1 already built)

```
.mcp-cache/pages/*.json
```

## Frameworks MCP

Promptpacks retrieval layer
(read-only MCP surface)

---

# NON NEGOTIABLE RULES

You MUST:

- Additive only changes
- Never break runtime exit code contract
- Never rename runtime artifact files
- Never change run layout
- Never move `history/run-index.jsonl`
- Deterministic file discovery
- Canonical JSON stringify
- POSIX normalized paths
- No network calls required
- AI optional only (never governance authority)

---

# TARGET SYSTEM STATE

MindTrace becomes:

```
scan_repo()
↓
infer_structure()
↓
detect_framework_style()
↓
generate_automation_contract()
↓
fingerprint_contract()
↓
build_page_semantic_cache()
↓
runtime executes under contract
↓
governance enforces contract
↓
healing operates inside contract
↓
cross-framework adaptation
↓
learning loop updates cache confidence
```

Healing must become:
Contract-aware
NOT DOM-reactive

---

# REQUIRED MONOREPO STRUCTURE

```
repo-intelligence-mcp/
  src/
    mcp/
      server.ts
      cli.ts
    tools/
      scanRepo.ts
      detectFramework.ts
      detectStyle.ts
      inferStructure.ts
      detectLocatorStyle.ts
      detectAssertionStyle.ts
      generateContract.ts
      fingerprintContract.ts
      phase0Run.ts
      buildPageCacheV1.ts
      enrichPageCacheV1.ts
      runtimeLearning.ts
    contracts/
      writeContractBundle.ts
      writeSchemas.ts
    core/
      deterministic.ts
      hashing.ts
      normalization.ts
      fs.ts
    schemas/
      *.schema.json
    types/
      contract.ts
      topology.ts
      signals.ts
      pageCache.ts
```

---

# PHASE 0 — CONTRACT LOCK (BUILD OR HARDEN)

Must ADD:

```
.mcp-contract/
  automation-contract.json
  page-key-policy.json
  contract.meta.json
  automation-contract.hash
```

automation-contract.json MUST include:

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

automation-contract.hash:
SHA256 over normalized JSON of:

- automation-contract.json
- repo-topology.json
- framework-pattern.json
- selector-strategy.json
- assertion-style.json
- wrapper-discovery.json
- page-key-policy.json

---

# PHASE 1 — SEMANTIC PAGE CACHE (V1)

Add NEW cache (do not remove old):

```
.mcp-cache/v1/
  meta.json
  pages/<pageKey>.json
```

Each page MUST include:

- pageKey
- style
- semanticRoles
- labels
- stableIds
- anchors
- interactionTargets[]
- locatorCandidates[]
- contract_hash

Cache validity == contract hash

---

# PHASE 2 — RUNTIME CONTRACT EXECUTION

Runtime must:

- Load `.mcp-contract/automation-contract.json`
- Load `.mcp-cache/v1/*`
- Write:
  ```
  runs/<runName>/artifacts/runtime-contract-context.json
  ```

Failure to find contract/cache remains NON-FATAL initially.

---

# PHASE 3 — HEALING ENGINE UPGRADE

Selector ranking order becomes:
1 contract locator strategy
2 semantic page cache
3 last-known-good
4 deterministic fallback
5 LLM-assisted ranking

LLM NEVER:

- overrides governance
- mutates contract

---

# PHASE 4 — CROSS FRAMEWORK ADAPTER

Create:

```
framework-adapter-mcp/
  adapt_locator
  adapt_assertion
  adapt_fixture
  adapt_interaction
```

Enable:

- Cypress → Playwright
- Playwright → Cypress

Contract-driven mapping only.

---

# PHASE 5 — RUNTIME LEARNING LOOP

On successful heal:
Update:

- contract confidence score
- page interaction score

Append to:

```
history/run-index.jsonl
```

---

# PHASE 6 — ENTERPRISE LAYER

Expose CLI:

- Contract Builder
- Migration Adapter
- Runtime Healing SaaS

---

# IMPLEMENTATION ORDER

1 Phase0Run
2 Contract JSON
3 Fingerprint
4 Page Cache V1
5 Runtime Contract Loader
6 Healing Ranking Upgrade
7 Adapter MCP
8 Learning Loop

---

# DELIVERY RULES

When providing changes:

- Provide FULL FILES
  OR
- Provide cat heredoc edits

---

# DONE WHEN

- Phase0Run produces deterministic contract bundle
- Page cache V1 bound to contract hash
- Runtime loads contract without regression
- Healing respects contract strategy
- Adapters work for both frameworks
- Governance exit codes unchanged

Begin by printing the updated repo-intelligence-mcp tree.
Proceed phase by phase.
Do not skip steps.
Do not propose UI/dashboard work.

# OTHER POINTS TO acknowledge.

# MindTrace — Policy & Boundaries Spec

## Contract Authority • Versioning • Cache Invalidation • Evidence • Failure Taxonomy

Last Updated: 2026-03-02

This document defines **system governance boundaries** for MindTrace to ensure:

- Deterministic execution
- Enterprise-safe behavior
- CI stability
- Contract-first healing
- Non-regression of runtime/governance kernel

This is a **non-optional design contract** for all current and future features.

---

# 1. AUTHORITY MODEL (WHO WRITES WHAT)

## 1.1 Source-of-Truth Artifacts

| Artifact Location         | Authority Writer                | Read By                  | Mutability         |
| ------------------------- | ------------------------------- | ------------------------ | ------------------ |
| `.mcp-contract/*`         | repo-intelligence-mcp (Phase 0) | runtime, adapters, cache | WRITE-ONCE PER RUN |
| `.mcp-cache/*`            | page-cache builder (Phase 1)    | runtime, healing engine  | CONTRACT-BOUND     |
| `runs/*/artifacts/*`      | runtime                         | governance               | RUN-LOCAL          |
| `runs/*/audit/*`          | runtime                         | governance, enterprise   | APPEND-ONLY        |
| `history/run-index.jsonl` | runtime learning loop (P5)      | adapters, reporting      | APPEND-ONLY        |

### Strict Rules

- Runtime **MUST NOT write** to `.mcp-contract/*`
- Runtime **MUST NOT write** to `.mcp-cache/*`
- Cache builder **MUST NOT mutate** contract
- Governance **MUST NOT modify runtime artifacts**
- LLM/AI **MUST NOT write** to contract/cache under any circumstance

---

# 2. VERSIONING + COMPATIBILITY POLICY

## 2.1 Schema Versioning

All contract + cache files MUST contain:

```
schema_version: "<major>.<minor>.<patch>"
```

### Breaking Change (MAJOR)

- run layout changes
- required artifact names change
- exit code semantics change
- contract key structure changes

### Non-breaking (MINOR)

- additional optional fields
- new evidence categories
- new adapter capabilities

### Patch

- validation logic
- metadata
- warnings fields

---

## 2.2 Runtime Compatibility

Runtime MUST:

- read `contract.schema_version == N`
- read `contract.schema_version == N-1`
- treat N-2 as unsupported unless governance policy allows

Governance decides enforcement timing.

---

# 3. CACHE INVALIDATION POLICY

Cache validity == Contract fingerprint

## 3.1 Required

```
.mcp-cache/meta.json.contract_hash ==
.mcp-contract/automation-contract.hash
```

If mismatch:

- Cache is INVALID
- Runtime must continue execution (non-fatal)
- Governance may escalate based on policy

## 3.2 Rebuild Triggers

- contract hash change
- schema_version major bump
- framework style change
- entrypoint change
- selector-strategy change
- assertion-style change

---

# 4. EVIDENCE MODEL (TRUST + DEBUG)

Every inferred field in:

- framework-pattern.json
- selector-strategy.json
- assertion-style.json
- automation-contract.json

MUST include:

```
evidence: [
  {
    kind: "config|dependency|wrapper|pattern",
    file: "relative/path",
    sample: "optional snippet"
  }
]
```

Evidence is required for:

- framework detection
- style detection
- architecture inference
- locator strategy detection
- assertion style detection

---

# 5. FAILURE TAXONOMY + HEALABILITY

## 5.1 Standard Categories

| Category        | Healable | Immediate Fail |
| --------------- | -------- | -------------- |
| selectorMissing | yes      | no             |
| elementDetached | yes      | no             |
| timeout         | partial  | policy         |
| assertion       | no       | yes            |
| network4xx      | no       | yes            |
| network5xx      | policy   | policy         |
| environment     | no       | yes            |
| auth            | no       | yes            |
| testData        | no       | yes            |
| flake           | yes      | no             |

---

## 5.2 Healing Authority

Healing Engine MAY:

- attempt selector recovery
- attempt semantic match

Healing Engine MUST NOT:

- alter test assertions
- override policy
- write to contract

---

# 6. ALLOWED vs OBSERVED STRATEGY

Contract must distinguish:

```
observedStrategies: []
allowedStrategies: []
```

Allows enterprise migration without runtime breakage.

---

# 7. CONTRACT VALIDATION GATE

CI pre-run check MUST:

- validate contract schema
- verify hash integrity
- validate cache meta binding

Governance escalates on:

- schema mismatch
- missing contract
- stale cache (policy-dependent)

---

# 8. SECURITY + PRIVACY DEFAULTS

- redact secrets from artifacts
- allowlist audit fields
- deterministic safe-mode logging
- no PII in contract/cache

---

# 9. ADAPTER SCOPE (PHASE 4)

IN:

- locators
- assertions
- fixtures
- hooks
- navigation
- waits
- retries

OUT (MVP):

- custom reporters
- plugin APIs
- Cypress tasks

---

# 10. CLI INTENT MODEL

Target commands:

```
mindtrace phase0
mindtrace phase1
mindtrace run
mindtrace adapt
```

---

# 11. ENTERPRISE GUARANTEES

System guarantees:

- deterministic contract bundle
- schema-validated artifacts
- stable exit codes
- immutable audit trail
- contract-aware healing
- read-only runtime contract access

---

# 12. ACCEPTANCE CRITERIA

System is compliant when:

- contract authority boundaries enforced
- cache invalidation enforced by hash
- evidence recorded for all inferences
- healing respects taxonomy
- governance exit codes unchanged
