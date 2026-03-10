# Documentation Organization & Phase 3 Update - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize documentation into categorized structure, add Phase 3 content, and update main README while maintaining backward compatibility.

**Architecture:** Incremental migration creating new docs/reference/, docs/architecture/, and docs/guides/ structure with deprecation notices in old locations.

**Tech Stack:** Markdown, Git

---

## Task 1: Create Directory Structure

**Files:**
- Create: `docs/reference/`
- Create: `docs/architecture/`
- Create: `docs/architecture/phases/`
- Create: `docs/guides/`

**Step 1: Create reference directory**

Run:
```bash
mkdir -p docs/reference
```

**Step 2: Create architecture directories**

Run:
```bash
mkdir -p docs/architecture/phases
```

**Step 3: Create guides directory**

Run:
```bash
mkdir -p docs/guides
```

**Step 4: Verify structure created**

Run:
```bash
ls -la docs/
```

Expected: Should show reference/, architecture/, guides/ directories

**Step 5: Commit**

```bash
git add docs/
git commit -m "docs: create new documentation directory structure

- Add docs/reference/ for compliance, enterprise, products
- Add docs/architecture/phases/ for phase documentation
- Add docs/guides/ for setup, quickstart, teamcity

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create compliance.md

**Files:**
- Create: `docs/reference/compliance.md`
- Read: `COMPLIANCE_DEFINITION_OF_DONE.md`

**Step 1: Copy content from root file**

Read `COMPLIANCE_DEFINITION_OF_DONE.md` and create `docs/reference/compliance.md` with same content.

**Step 2: Verify content**

Run:
```bash
diff COMPLIANCE_DEFINITION_OF_DONE.md docs/reference/compliance.md
```

Expected: No differences (identical content)

**Step 3: Commit**

```bash
git add docs/reference/compliance.md
git commit -m "docs: add reference/compliance.md

- Copy from COMPLIANCE_DEFINITION_OF_DONE.md
- Run layout contract, required artifacts, validation rules
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create enterprise-features.md

**Files:**
- Create: `docs/reference/enterprise-features.md`
- Read: `ENTERPRISE_FEATURES.md`

**Step 1: Copy content from root file**

Read `ENTERPRISE_FEATURES.md` and create `docs/reference/enterprise-features.md` with same content.

**Step 2: Verify content**

Run:
```bash
diff ENTERPRISE_FEATURES.md docs/reference/enterprise-features.md
```

Expected: No differences

**Step 3: Commit**

```bash
git add docs/reference/enterprise-features.md
git commit -m "docs: add reference/enterprise-features.md

- Copy from ENTERPRISE_FEATURES.md
- Runtime architecture, policy governance, multi-tenant design
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create products.md

**Files:**
- Create: `docs/reference/products.md`
- Read: `PRODUCTS.md`

**Step 1: Copy content from root file**

Read `PRODUCTS.md` and create `docs/reference/products.md` with same content.

**Step 2: Verify content**

Run:
```bash
diff PRODUCTS.md docs/reference/products.md
```

Expected: No differences

**Step 3: Commit**

```bash
git add docs/reference/products.md
git commit -m "docs: add reference/products.md

- Copy from PRODUCTS.md
- Product offerings, feature matrix, licensing
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create architecture/overview.md

**Files:**
- Create: `docs/architecture/overview.md`
- Read: `PROJECT_OVERVIEW.md`
- Read: `docs/ARCHITECTURE.md`

**Step 1: Consolidate content**

Create `docs/architecture/overview.md` combining:
- PROJECT_OVERVIEW.md (project description, package contents)
- docs/ARCHITECTURE.md (system components, data flow, failure classification)

**Step 2: Verify structure**

Check that overview.md contains:
- System overview
- Component architecture
- Data flow diagrams
- Framework styles

**Step 3: Commit**

```bash
git add docs/architecture/overview.md
git commit -m "docs: add architecture/overview.md

- Consolidate PROJECT_OVERVIEW.md + ARCHITECTURE.md
- System architecture, components, data flow
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create phases/phase0-contracts.md

**Files:**
- Create: `docs/architecture/phases/phase0-contracts.md`
- Read: `repo-intelligence-mcp/README.phase0.md`
- Read: `docs/plans/2026-03-02-phase0-contract-generators-design.md`

**Step 1: Write phase0-contracts.md**

Create `docs/architecture/phases/phase0-contracts.md` with:
- Overview from README.phase0.md
- Architecture summary
- Generated files
- Link to design doc: `[Design Doc](../../../plans/2026-03-02-phase0-contract-generators-design.md)`
- Link to implementation: `[Implementation](../../../plans/2026-03-02-phase0-contract-generators-implementation.md)`

**Step 2: Verify links**

Check that relative paths work:
```bash
ls -la docs/plans/2026-03-02-phase0-contract-generators-design.md
```

**Step 3: Commit**

```bash
git add docs/architecture/phases/phase0-contracts.md
git commit -m "docs: add phases/phase0-contracts.md

- Contract bundle generation overview
- Deterministic detection, schema validation
- Links to design & implementation docs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create phases/phase1-cache.md

**Files:**
- Create: `docs/architecture/phases/phase1-cache.md`
- Read: `repo-intelligence-mcp/README.phase1.md`
- Read: `docs/plans/2026-03-03-phase1-real-detection-page-cache-design.md`

**Step 1: Write phase1-cache.md**

Create `docs/architecture/phases/phase1-cache.md` with:
- Overview from README.phase1.md (if exists, otherwise create from design docs)
- Page semantic cache architecture
- Real detection integration
- Cache building process
- Link to design & implementation docs

**Step 2: Verify content**

Check includes: cache structure, detection, binding

**Step 3: Commit**

```bash
git add docs/architecture/phases/phase1-cache.md
git commit -m "docs: add phases/phase1-cache.md

- Page semantic cache overview
- Real detection, cache building, binding to contracts
- Links to design & implementation docs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create phases/phase2-awareness.md

**Files:**
- Create: `docs/architecture/phases/phase2-awareness.md`
- Read: `mindtrace-ai-runtime/README.phase2.0.md`
- Read: `docs/plans/2026-03-04-phase2.0-contract-awareness-design.md`

**Step 1: Write phase2-awareness.md**

Create `docs/architecture/phases/phase2-awareness.md` with:
- Overview from README.phase2.0.md
- Contract-awareness module architecture
- Dual-read paths (canonical vs legacy)
- Compliance modes (COMPLIANCE vs BEST_EFFORT)
- Runtime strategy context
- Link to design & implementation docs

**Step 2: Verify content**

Check includes: dual-read, validation, strategy context

**Step 3: Commit**

```bash
git add docs/architecture/phases/phase2-awareness.md
git commit -m "docs: add phases/phase2-awareness.md

- Contract-awareness module overview
- Dual-read paths, compliance modes, strategy context
- Links to design & implementation docs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create phases/phase3-healing.md (NEW)

**Files:**
- Create: `docs/architecture/phases/phase3-healing.md`
- Read: `docs/plans/2026-03-04-phase3-healing-engine-design.md`
- Read: `docs/plans/2026-03-04-phase3-healing-engine-implementation.md`

**Step 1: Write phase3-healing.md**

Create with this structure:

```markdown
# Phase 3: Healing Engine

**Status:** Complete (Architecture Frozen)
**Design Doc:** [2026-03-04-phase3-healing-engine-design.md](../../../plans/2026-03-04-phase3-healing-engine-design.md)
**Implementation Plan:** [2026-03-04-phase3-healing-engine-implementation.md](../../../plans/2026-03-04-phase3-healing-engine-implementation.md)

## Overview

Contract-aware healing engine with 5-tier selector ranking system that respects governance-first architecture.

**Implementation:** 20 tasks, 116 tests passing

## Architecture

### 5-Tier Ranking System

1. **Contract** (governance-first, highest authority)
   - Policy-defined selectors from `.mcp-contract/selector-policy.json`
   - Highest priority, never overridden
   - Risk scoring: testid=0.05, role=0.10, xpath=0.90

2. **Cache** (semantic page signals, high confidence)
   - Page semantic signals from `.mcp-cache/v1/pages/*.json`
   - Action-aware filtering (link not valid for fill, etc.)
   - Sorted by confidence (desc) then risk (asc)

3. **Last-Known-Good** (historical fallback, cross-framework guarded)
   - Extracts successful selectors from recent runs
   - Cross-framework poison guard (filters by framework + primaryStyle)
   - Max 10 recent runs, ranked by confidence

4. **Fallback** (deterministic, action-aware, bounded)
   - Probe plan generator with strict caps (max 20 candidates, max 6 probes)
   - Action-compatible roles only
   - Deterministic last-resort tier

5. **LLM** (stub only - advisory, never overrides)
   - Advisory tier only (not yet implemented)
   - Will never override governance policy
   - Will never mutate contracts or write to cache

### Core Components

**Healing Orchestrator** - [`healing-orchestrator.ts`](../../../mindtrace-ai-runtime/src/healing-engine/healing-orchestrator.ts)
- Coordinates tier execution (Contract → Cache → LKG → Fallback → LLM stub)
- Budget enforcement before each probe
- Writes attempts to healing-attempts.jsonl
- Returns HealResult with outcome + selected candidate

**Budget Tracker** - [`budget-tracker.ts`](../../../mindtrace-ai-runtime/src/healing-engine/budget-tracker.ts)
- Enforces maxAttemptsPerStep (2) and maxAttemptsPerRun (10)
- Reads healing-attempts.jsonl to count previous attempts
- Returns remaining budget for each scope

**Ledger Writer** - [`ledger-writer.ts`](../../../mindtrace-ai-runtime/src/healing-engine/ledger-writer.ts)
- Appends to healing-attempts.jsonl
- Recursive canonical JSON (ensures deterministic output)
- Clones input to avoid mutation

**Candidate Tester** - [`candidate-tester.ts`](../../../mindtrace-ai-runtime/src/healing-engine/candidate-tester.ts)
- Probes candidates using PageAdapter
- ATTACHED_VISIBLE_ENABLED probe method
- Returns "success", "timeout", "not_attached", etc.

**Artifact Writer** - [`artifact-writer.ts`](../../../mindtrace-ai-runtime/src/healing-engine/artifact-writer.ts)
- Writes healing-outcome.json (per-step outcome)
- Writes healing-summary.json (run-level aggregate)
- Canonical JSON with recursive key sorting

### Key Guarantees

✅ **Deterministic**: No AI in decision path, no network calls, no timestamps, no random IDs
✅ **Byte-identical**: Canonical JSON with recursive sorting at all nesting levels
✅ **Budget-enforced**: Hard caps at 2 attempts/step, 10 attempts/run
✅ **Append-only**: healing-attempts.jsonl as single source of truth
✅ **Cross-framework safe**: Framework + primaryStyle filtering prevents poison
✅ **Action-aware**: Selectors filtered by compatibility (link not valid for fill, etc.)

### Governance Non-Negotiables

- LLM NEVER overrides governance policy
- LLM NEVER mutates contracts
- LLM NEVER writes to cache
- LLM NEVER claims authority
- Contract selectors have highest priority
- All decisions are deterministic-core + governance-controlled

## Runtime Artifacts

**Generated during test execution:**

```
runs/<runId>/artifacts/runtime/
├── healing-attempts.jsonl      # Append-only ledger (all probe attempts)
├── healing-outcome.json        # Per-step healing result
└── healing-summary.json        # Run-level aggregate
```

All artifacts use canonical JSON (recursively sorted keys) for byte-identical deterministic output.

## Test Coverage

**116 tests passing** across 20 components:
- 17 component unit tests
- 4 tier-specific tests
- 1 E2E integration test

All following TDD workflow (test → verify fail → implement → verify pass → commit).

## Implementation

See [Implementation Plan](../../../plans/2026-03-04-phase3-healing-engine-implementation.md) for 20 detailed tasks with TDD steps.
```

**Step 2: Verify links**

Check that all relative paths work:
```bash
ls -la mindtrace-ai-runtime/src/healing-engine/healing-orchestrator.ts
ls -la docs/plans/2026-03-04-phase3-healing-engine-design.md
```

**Step 3: Commit**

```bash
git add docs/architecture/phases/phase3-healing.md
git commit -m "docs: add phases/phase3-healing.md

- 5-tier ranking system (Contract, Cache, LKG, Fallback, LLM stub)
- Core components: orchestrator, budget tracker, ledger writer
- Deterministic guarantees, governance non-negotiables
- 116 tests passing, 20 tasks complete
- Links to design & implementation docs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Move guides/setup.md

**Files:**
- Create: `docs/guides/setup.md`
- Read: `docs/SETUP.md`
- Delete (later): `docs/SETUP.md`

**Step 1: Copy to new location**

Run:
```bash
cp docs/SETUP.md docs/guides/setup.md
```

**Step 2: Verify content**

Run:
```bash
diff docs/SETUP.md docs/guides/setup.md
```

Expected: No differences

**Step 3: Commit (don't delete original yet)**

```bash
git add docs/guides/setup.md
git commit -m "docs: add guides/setup.md

- Copy from docs/SETUP.md
- Setup instructions, installation guide
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Move guides/client-setup.md

**Files:**
- Create: `docs/guides/client-setup.md`
- Read: `docs/CLIENT_SETUP_PROMPT.md`

**Step 1: Copy to new location**

Run:
```bash
cp docs/CLIENT_SETUP_PROMPT.md docs/guides/client-setup.md
```

**Step 2: Verify content**

Run:
```bash
diff docs/CLIENT_SETUP_PROMPT.md docs/guides/client-setup.md
```

Expected: No differences

**Step 3: Commit**

```bash
git add docs/guides/client-setup.md
git commit -m "docs: add guides/client-setup.md

- Copy from docs/CLIENT_SETUP_PROMPT.md
- Client setup instructions
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Consolidate guides/teamcity.md

**Files:**
- Create: `docs/guides/teamcity.md`
- Read: `TEAMCITY.md`
- Read: `docs/TEAMCITY.md`

**Step 1: Consolidate content**

Read both TEAMCITY.md files, consolidate unique content into `docs/guides/teamcity.md`.

**Step 2: Verify completeness**

Check that guides/teamcity.md contains all unique content from both sources.

**Step 3: Commit**

```bash
git add docs/guides/teamcity.md
git commit -m "docs: add guides/teamcity.md

- Consolidate root TEAMCITY.md + docs/TEAMCITY.md
- TeamCity CI/CD integration guide
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Move guides/quickstart.md

**Files:**
- Create: `docs/guides/quickstart.md`
- Read: `QUICKSTART.md`

**Step 1: Copy to new location**

Run:
```bash
cp QUICKSTART.md docs/guides/quickstart.md
```

**Step 2: Verify content**

Run:
```bash
diff QUICKSTART.md docs/guides/quickstart.md
```

Expected: No differences

**Step 3: Commit**

```bash
git add docs/guides/quickstart.md
git commit -m "docs: add guides/quickstart.md

- Copy from QUICKSTART.md
- 5-minute setup guide
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Add deprecation notice to COMPLIANCE_DEFINITION_OF_DONE.md

**Files:**
- Modify: `COMPLIANCE_DEFINITION_OF_DONE.md:1-1`

**Step 1: Add deprecation header**

Prepend this header to COMPLIANCE_DEFINITION_OF_DONE.md:

```markdown
# ⚠️ DEPRECATED - This file has moved

**New location:** [docs/reference/compliance.md](docs/reference/compliance.md)

This file will be removed in v2.0.0. Please update your bookmarks.

---

```

**Step 2: Verify format**

Check that header is at top, followed by original content.

**Step 3: Commit**

```bash
git add COMPLIANCE_DEFINITION_OF_DONE.md
git commit -m "docs: deprecate COMPLIANCE_DEFINITION_OF_DONE.md

- Add deprecation notice pointing to docs/reference/compliance.md
- File will be removed in v2.0.0
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Add deprecation notices to remaining root files

**Files:**
- Modify: `ENTERPRISE_FEATURES.md:1-1`
- Modify: `PRODUCTS.md:1-1`
- Modify: `PROJECT_OVERVIEW.md:1-1`
- Modify: `TEAMCITY.md:1-1`
- Modify: `QUICKSTART.md:1-1`

**Step 1: Add headers to all 5 files**

Add appropriate deprecation headers:

**ENTERPRISE_FEATURES.md:**
```markdown
# ⚠️ DEPRECATED - This file has moved

**New location:** [docs/reference/enterprise-features.md](docs/reference/enterprise-features.md)

This file will be removed in v2.0.0. Please update your bookmarks.

---

```

**PRODUCTS.md:**
```markdown
# ⚠️ DEPRECATED - This file has moved

**New location:** [docs/reference/products.md](docs/reference/products.md)

This file will be removed in v2.0.0. Please update your bookmarks.

---

```

**PROJECT_OVERVIEW.md:**
```markdown
# ⚠️ DEPRECATED - This file has moved

**New location:** [docs/architecture/overview.md](docs/architecture/overview.md)

This file will be removed in v2.0.0. Please update your bookmarks.

---

```

**TEAMCITY.md:**
```markdown
# ⚠️ DEPRECATED - This file has moved

**New location:** [docs/guides/teamcity.md](docs/guides/teamcity.md)

This file will be removed in v2.0.0. Please update your bookmarks.

---

```

**QUICKSTART.md:**
```markdown
# ⚠️ DEPRECATED - This file has moved

**New location:** [docs/guides/quickstart.md](docs/guides/quickstart.md)

This file will be removed in v2.0.0. Please update your bookmarks.

---

```

**Step 2: Verify all headers added**

Check each file starts with deprecation notice.

**Step 3: Commit**

```bash
git add ENTERPRISE_FEATURES.md PRODUCTS.md PROJECT_OVERVIEW.md TEAMCITY.md QUICKSTART.md
git commit -m "docs: deprecate root-level documentation files

- Add deprecation notices to 5 files
- Point to new locations in docs/
- Files will be removed in v2.0.0

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Create repo-intelligence-mcp/README.md breadcrumb

**Files:**
- Create: `repo-intelligence-mcp/README.md`

**Step 1: Write breadcrumb README**

Create `repo-intelligence-mcp/README.md`:

```markdown
# Repo Intelligence MCP

MCP server for repository intelligence, contract generation, and page cache building.

## Phase Documentation

- **[Phase 0: Contract Generators](../docs/architecture/phases/phase0-contracts.md)**
  - Contract bundle generation
  - Deterministic detection
  - Schema validation

- **[Phase 1: Page Cache](../docs/architecture/phases/phase1-cache.md)**
  - Page semantic cache
  - Real detection
  - Cache building

## Usage

See phase documentation above for detailed architecture and usage information.

## Legacy Phase READMEs

⚠️ The following files are deprecated:
- `README.phase0.md` → See [Phase 0 docs](../docs/architecture/phases/phase0-contracts.md)
- `README.phase1.md` → See [Phase 1 docs](../docs/architecture/phases/phase1-cache.md)
```

**Step 2: Verify links**

Check that relative paths work:
```bash
ls -la docs/architecture/phases/phase0-contracts.md
ls -la docs/architecture/phases/phase1-cache.md
```

**Step 3: Commit**

```bash
git add repo-intelligence-mcp/README.md
git commit -m "docs: add repo-intelligence-mcp breadcrumb README

- Point to Phase 0 and Phase 1 documentation
- Deprecate README.phase0.md and README.phase1.md
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 17: Create mindtrace-ai-runtime/README.md breadcrumb

**Files:**
- Create: `mindtrace-ai-runtime/README.md`

**Step 1: Write breadcrumb README**

Create `mindtrace-ai-runtime/README.md`:

```markdown
# MindTrace AI Runtime

Governance-first test automation runtime for Playwright with contract-awareness and healing engine.

## Phase Documentation

- **[Phase 2.0: Contract Awareness](../docs/architecture/phases/phase2-awareness.md)**
  - Contract-awareness module
  - Runtime strategy context
  - Dual-read paths
  - Compliance modes

- **[Phase 3: Healing Engine](../docs/architecture/phases/phase3-healing.md)**
  - 5-tier selector ranking system
  - Healing orchestrator
  - Budget enforcement
  - Deterministic guarantees

## Usage

See phase documentation above for detailed architecture and API reference.

## Modules

- **Contract Awareness** (`src/contract-awareness/`) - Phase 2.0
- **Healing Engine** (`src/healing-engine/`) - Phase 3

## Legacy Phase README

⚠️ The following file is deprecated:
- `README.phase2.0.md` → See [Phase 2.0 docs](../docs/architecture/phases/phase2-awareness.md)
```

**Step 2: Verify links**

Check that relative paths work:
```bash
ls -la docs/architecture/phases/phase2-awareness.md
ls -la docs/architecture/phases/phase3-healing.md
```

**Step 3: Commit**

```bash
git add mindtrace-ai-runtime/README.md
git commit -m "docs: add mindtrace-ai-runtime breadcrumb README

- Point to Phase 2.0 and Phase 3 documentation
- Deprecate README.phase2.0.md
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 18: Create prompt deprecation notices

**Files:**
- Create: `prompts/DEPRECATED.md`
- Create: `frameworks-mcp/prompts/DEPRECATED.md`
- Create: `mindtrace-ai-runtime/prompts/DEPRECATED.md`

**Step 1: Create prompts/DEPRECATED.md**

```markdown
# ⚠️ Deprecated Prompt Location

**Canonical location:** [shared-packages/promptpacks/prompts/](../shared-packages/promptpacks/prompts/)

This directory is maintained for backward compatibility but will be removed in v2.0.0.

## Migration

Please update references to use the canonical location:

```
# Old (deprecated)
prompts/bdd/main.md
prompts/native/main.md
prompts/pom-bdd/main.md

# New (canonical)
shared-packages/promptpacks/prompts/bdd/main.md
shared-packages/promptpacks/prompts/native/main.md
shared-packages/promptpacks/prompts/pom-bdd/main.md
```
```

**Step 2: Create frameworks-mcp/prompts/DEPRECATED.md**

```markdown
# ⚠️ Deprecated Prompt Location

**Canonical location:** [../../shared-packages/promptpacks/prompts/](../../shared-packages/promptpacks/prompts/)

This directory is maintained for backward compatibility but will be removed in v2.0.0.

Please update references to use the canonical location in `shared-packages/promptpacks/prompts/`.
```

**Step 3: Create mindtrace-ai-runtime/prompts/DEPRECATED.md**

```markdown
# ⚠️ Deprecated Prompt Location

**Canonical location:** [../shared-packages/promptpacks/prompts/](../shared-packages/promptpacks/prompts/)

This directory is maintained for backward compatibility but will be removed in v2.0.0.

Please update references to use the canonical location in `shared-packages/promptpacks/prompts/`.
```

**Step 4: Commit**

```bash
git add prompts/DEPRECATED.md frameworks-mcp/prompts/DEPRECATED.md mindtrace-ai-runtime/prompts/DEPRECATED.md
git commit -m "docs: add prompt folder deprecation notices

- Deprecate prompts/ (root)
- Deprecate frameworks-mcp/prompts/
- Deprecate mindtrace-ai-runtime/prompts/
- Point to canonical location: shared-packages/promptpacks/prompts/

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 19: Update main README - Phase indicator

**Files:**
- Modify: `README.md:15-15` (Phase 2.0 Complete → Phase 3 Complete)
- Modify: `README.md:31-56` (Add Phase 3 architecture section)

**Step 1: Change Phase 2.0 → Phase 3**

Find line ~15:
```markdown
# 🎯 What MindTrace Is (Phase 2.0 Complete)
```

Change to:
```markdown
# 🎯 What MindTrace Is (Phase 3 Complete)
```

**Step 2: Update feature list**

Around line 18-24, update to:
```markdown
MindTrace transforms Playwright into:

• A policy-controlled execution engine
• A contract-validated test runtime
• A deterministic artifact generator
• A governance-first healing system
• A CI-governed compliance system
• An audit-ready execution layer
```

**Step 3: Add Phase 3 description**

After the feature list (~line 25), add:

```markdown

**Phase 3 Healing Engine** provides contract-aware selector ranking with 5-tier system:
1. **Contract** (governance-first, highest authority)
2. **Cache** (semantic signals, high confidence)
3. **Last-Known-Good** (historical fallback)
4. **Fallback** (deterministic, bounded)
5. **LLM** (advisory only, never overrides)
```

**Step 4: Verify changes**

Check that README mentions Phase 3 and 5-tier system.

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: update README to Phase 3

- Change Phase 2.0 Complete → Phase 3 Complete
- Add 'governance-first healing system' to feature list
- Add 5-tier ranking system description
- Part of documentation reorganization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 20: Update main README - Artifacts list

**Files:**
- Modify: `README.md:67-92` (Add Phase 3 artifacts)

**Step 1: Find artifacts section**

Locate the artifacts section (around line 67-92).

**Step 2: Add Phase 3 artifacts**

Add these lines to the artifacts list:

```markdown
│ ├── contract-awareness.json          # Phase 2.0: Contract validation result
│ ├── contract-snapshot.json           # Phase 2.2.1: Contract bundle snapshot
│ ├── contract-utilization.json        # Phase 2.2.2: Contract usage tracking
│ │
│ ├── runtime/                          # Phase 3: Healing runtime artifacts
│ │   ├── healing-attempts.jsonl       # Append-only healing ledger
│ │   ├── healing-outcome.json         # Per-step healing result
│ │   └── healing-summary.json         # Run-level healing aggregate
```

**Step 3: Verify format**

Check that artifacts section shows proper nesting and comments.

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add Phase 3 artifacts to README

- Add runtime/ subdirectory for healing artifacts
- healing-attempts.jsonl (append-only ledger)
- healing-outcome.json (per-step result)
- healing-summary.json (run-level aggregate)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 21: Update main README - Add navigation section

**Files:**
- Modify: `README.md` (Add documentation navigation section after overview)

**Step 1: Add navigation section**

After the Phase 3 architecture section (~line 56), add:

```markdown

---

# 📚 Documentation

Quick access to documentation:

- **[Quick Start Guide](docs/guides/quickstart.md)** - Get started in 5 minutes
- **[Architecture Overview](docs/architecture/overview.md)** - System design and components
- **[Phase Documentation](docs/architecture/phases/)** - Detailed phase architecture
  - [Phase 0: Contract Generators](docs/architecture/phases/phase0-contracts.md)
  - [Phase 1: Page Cache](docs/architecture/phases/phase1-cache.md)
  - [Phase 2.0: Contract Awareness](docs/architecture/phases/phase2-awareness.md)
  - [Phase 3: Healing Engine](docs/architecture/phases/phase3-healing.md)
- **[Reference Documentation](docs/reference/)** - Compliance, enterprise features, products
- **[Setup & Guides](docs/guides/)** - Installation, TeamCity, client setup

---
```

**Step 2: Verify links**

Check that all referenced files exist:
```bash
ls -la docs/guides/quickstart.md
ls -la docs/architecture/overview.md
ls -la docs/architecture/phases/
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add navigation section to README

- Link to quick start, architecture, phase docs
- Link to reference documentation
- Link to setup guides
- Provides clear entry points to all documentation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 22: Verify all links work

**Files:**
- Check: All new markdown files for broken links

**Step 1: Check reference links**

Verify all links in docs/reference/ work:
```bash
# Check each file's relative links
grep -r "\[.*\](.*)" docs/reference/
```

**Step 2: Check architecture links**

Verify all links in docs/architecture/ work:
```bash
grep -r "\[.*\](.*)" docs/architecture/
```

**Step 3: Check breadcrumb links**

Verify breadcrumb READMEs link correctly:
```bash
grep -r "\[.*\](.*)" repo-intelligence-mcp/README.md
grep -r "\[.*\](.*)" mindtrace-ai-runtime/README.md
```

**Step 4: Check main README links**

Verify README navigation links work:
```bash
grep "docs/" README.md | grep -o "\[.*\](.*)"
```

**Step 5: Document verification**

No commit - verification only

---

## Task 23: Verify old locations still accessible

**Files:**
- Check: All deprecated files still exist and are readable

**Step 1: Verify root files exist**

Check deprecated root files:
```bash
ls -la COMPLIANCE_DEFINITION_OF_DONE.md
ls -la ENTERPRISE_FEATURES.md
ls -la PRODUCTS.md
ls -la PROJECT_OVERVIEW.md
ls -la TEAMCITY.md
ls -la QUICKSTART.md
```

Expected: All files exist with deprecation headers

**Step 2: Verify old phase READMEs exist**

Check phase-specific READMEs:
```bash
ls -la repo-intelligence-mcp/README.phase0.md
ls -la repo-intelligence-mcp/README.phase1.md
ls -la mindtrace-ai-runtime/README.phase2.0.md
```

Expected: All files still exist (not deleted)

**Step 3: Verify prompt folders exist**

Check prompt folders:
```bash
ls -la prompts/bdd/main.md
ls -la frameworks-mcp/prompts/bdd/main.md
ls -la mindtrace-ai-runtime/prompts/bdd/main.md
```

Expected: All still exist (not deleted)

**Step 4: Document verification**

No commit - verification only

---

## Task 24: Final verification and push

**Files:**
- All documentation files

**Step 1: Run full test suite**

Verify nothing broke:
```bash
cd mindtrace-ai-runtime && npm test
```

Expected: All 116 tests still passing

**Step 2: Check git status**

Verify all changes committed:
```bash
git status
```

Expected: Working tree clean

**Step 3: Review commit history**

Check all commits present:
```bash
git log --oneline | head -24
```

Expected: See all 23 commits from tasks 1-21

**Step 4: Push to remote**

```bash
git push MindTrace phase3-healing-engine
```

Expected: All commits pushed successfully

---

## Implementation Complete!

**Summary:**
- ✅ Created new docs/ structure (reference, architecture, guides)
- ✅ Added Phase 3 documentation
- ✅ Deprecated old locations with clear notices
- ✅ Updated main README for Phase 3
- ✅ All links verified working
- ✅ Backward compatibility maintained

**What was done:**
- 13 new documentation files created
- 3 breadcrumb READMEs added
- 6 root files deprecated (not deleted)
- 3 prompt folder deprecation notices
- Main README updated with Phase 3 content
- All tests still passing (116 tests)

**What was NOT done (intentionally):**
- ❌ Old files NOT deleted (backward compatible)
- ❌ Prompt folders NOT consolidated (deprecated only)
- ❌ External references NOT updated (future work)
