# Documentation Organization & Phase 3 Update - Design

**Date:** 2026-03-10
**Status:** Approved
**Approach:** Incremental Migration (Backward Compatible)

## Overview

Reorganize scattered documentation into categorized structure, add Phase 3 content, update main README, and deprecate duplicate locations while maintaining backward compatibility.

## Problem Statement

**Current issues:**
1. Scattered root-level docs (COMPLIANCE, ENTERPRISE_FEATURES, PRODUCTS, PROJECT_OVERVIEW, TEAMCITY)
2. Duplicate TEAMCITY.md (root vs docs/)
3. Phase-specific READMEs in different packages (phase0, phase1, phase2.0)
4. Missing Phase 3 documentation
5. Multiple duplicate prompt folders (4 locations)
6. Main README outdated (still says "Phase 2.0 Complete")

## Design Decisions

### 1. Documentation Structure

**Chosen:** Categorized Structure (Option 2 from brainstorming)

```
docs/
├── reference/           # Specifications, compliance, products
│   ├── compliance.md
│   ├── enterprise-features.md
│   └── products.md
│
├── architecture/        # System design, phase overviews
│   ├── overview.md
│   └── phases/
│       ├── phase0-contracts.md
│       ├── phase1-cache.md
│       ├── phase2-awareness.md
│       └── phase3-healing.md
│
├── guides/             # How-to, setup, CI/CD
│   ├── setup.md
│   ├── client-setup.md
│   ├── teamcity.md
│   └── quickstart.md
│
├── archive/            # Historical docs (keep as-is)
└── plans/             # Design & implementation plans (keep as-is)
```

**Rationale:**
- Logical grouping scales better than flat structure
- Clear separation of concerns (reference vs architecture vs guides)
- Easier to find docs by category
- Matches enterprise documentation standards

### 2. Prompt Folder Handling

**Chosen:** Document & Deprecate (Option C from brainstorming)

- Keep all 4 prompt folders for backward compatibility
- Add `DEPRECATED.md` in old locations pointing to canonical
- Canonical location: `shared-packages/promptpacks/prompts/`
- Mark for removal in future major version (v2.0.0)

**Rationale:**
- No breaking changes
- Clear migration path for users
- Gradual deprecation cycle
- Can clean up in future major release

### 3. Phase 3 Documentation

**Chosen:** Consolidated in Main Docs (Option B from brainstorming)

- Create `docs/architecture/phases/phase3-healing.md`
- Reference design/implementation docs for details
- No separate `README.phase3.md` (avoid duplication)

**Rationale:**
- Single source of truth
- Less duplication than separate READMEs
- Better organization in centralized docs
- Links to detailed design/implementation plans

### 4. Migration Strategy

**Chosen:** Incremental Migration (Approach 1 from brainstorming)

**Steps:**
1. Create new structure (don't delete originals)
2. Add deprecation notices to old locations
3. Update main README
4. Leave breadcrumb READMEs in old locations

**Rationale:**
- Safe, reversible
- No breaking changes
- Backward compatible
- Can verify before cleanup

## New Documentation Content

### docs/reference/

**compliance.md** (from COMPLIANCE_DEFINITION_OF_DONE.md)
- Run layout contract
- Required artifacts
- Validation rules
- Exit codes

**enterprise-features.md** (from ENTERPRISE_FEATURES.md)
- Runtime architecture
- Policy governance
- Multi-tenant design
- CI/CD integration

**products.md** (from PRODUCTS.md)
- Product offerings
- Feature matrix
- Licensing
- Support tiers

### docs/architecture/

**overview.md** (consolidate PROJECT_OVERVIEW.md + ARCHITECTURE.md)
- System architecture
- Component overview
- Data flow
- Framework styles

**phases/phase0-contracts.md** (consolidate from repo-intelligence-mcp/README.phase0.md)
- Contract bundle generation
- Deterministic detection
- Schema validation
- Fingerprint verification

**phases/phase1-cache.md** (consolidate from repo-intelligence-mcp/README.phase1.md)
- Page semantic cache
- Real detection
- Cache building
- Binding to contracts

**phases/phase2-awareness.md** (consolidate from mindtrace-ai-runtime/README.phase2.0.md)
- Contract-awareness module
- Runtime strategy context
- Dual-read paths
- Compliance modes

**phases/phase3-healing.md** (NEW)
- 5-tier ranking system
- Healing orchestrator
- Budget enforcement
- Deterministic guarantees
- Link to design & implementation plans

### docs/guides/

**setup.md** (keep existing docs/SETUP.md)
**client-setup.md** (keep existing docs/CLIENT_SETUP_PROMPT.md)
**teamcity.md** (consolidate root TEAMCITY.md + docs/TEAMCITY.md)
**quickstart.md** (move from root QUICKSTART.md)

## Deprecation Strategy

### Root-Level Files

Add deprecation header to:
- COMPLIANCE_DEFINITION_OF_DONE.md
- ENTERPRISE_FEATURES.md
- PRODUCTS.md
- PROJECT_OVERVIEW.md
- TEAMCITY.md
- QUICKSTART.md

**Header format:**
```markdown
# ⚠️ DEPRECATED - This file has moved

**New location:** [docs/reference/compliance.md](docs/reference/compliance.md)

This file will be removed in v2.0.0. Please update your bookmarks.

---

[Original content follows...]
```

### Phase-Specific READMEs

Create breadcrumb READMEs:

**repo-intelligence-mcp/README.md:**
```markdown
# Repo Intelligence MCP

**Phase Documentation:**
- [Phase 0: Contract Generators](../docs/architecture/phases/phase0-contracts.md)
- [Phase 1: Page Cache](../docs/architecture/phases/phase1-cache.md)
```

**mindtrace-ai-runtime/README.md:**
```markdown
# MindTrace AI Runtime

**Phase Documentation:**
- [Phase 2.0: Contract Awareness](../docs/architecture/phases/phase2-awareness.md)
- [Phase 3: Healing Engine](../docs/architecture/phases/phase3-healing.md)
```

### Prompt Folders

Add `DEPRECATED.md` to:
- `prompts/DEPRECATED.md`
- `frameworks-mcp/prompts/DEPRECATED.md`
- `mindtrace-ai-runtime/prompts/DEPRECATED.md`

**Content:**
```markdown
# ⚠️ Deprecated Prompt Location

**Canonical location:** [shared-packages/promptpacks/prompts/](../../shared-packages/promptpacks/prompts/)

This directory is maintained for backward compatibility but will be removed in v2.0.0.

Please update references to use the canonical location.
```

## Main README Updates

### Changes:

1. **Phase indicator:** "Phase 2.0 Complete" → "Phase 3 Complete"

2. **Add Phase 3 section:**
```markdown
# 🎯 What MindTrace Is (Phase 3 Complete)

MindTrace transforms Playwright into:
• A policy-controlled execution engine
• A contract-validated test runtime
• A deterministic artifact generator
• A governance-first healing system  ← NEW
• A CI-governed compliance system
• An audit-ready execution layer

**Phase 3 Healing Engine** provides contract-aware selector ranking with 5-tier system:
1. Contract (governance-first, highest authority)
2. Cache (semantic signals, high confidence)
3. Last-Known-Good (historical fallback)
4. Fallback (deterministic, bounded)
5. LLM (advisory only, never overrides)
```

3. **Update artifacts list:**
```markdown
├── artifacts/
│   ├── healing-attempts.jsonl      # Phase 3: Append-only healing ledger
│   ├── healing-outcome.json        # Phase 3: Per-step healing result
│   ├── healing-summary.json        # Phase 3: Run-level healing aggregate
```

4. **Add navigation section:**
```markdown
# 📚 Documentation

- **Quick Start:** [docs/guides/quickstart.md](docs/guides/quickstart.md)
- **Architecture:** [docs/architecture/overview.md](docs/architecture/overview.md)
- **Phase Details:** [docs/architecture/phases/](docs/architecture/phases/)
- **Reference:** [docs/reference/](docs/reference/)
- **Guides:** [docs/guides/](docs/guides/)
```

## Migration Checklist

**Phase 1: Create New Structure**
- [ ] Create `docs/reference/`, `docs/architecture/`, `docs/guides/`
- [ ] Create `docs/architecture/phases/`
- [ ] Write `docs/reference/compliance.md`
- [ ] Write `docs/reference/enterprise-features.md`
- [ ] Write `docs/reference/products.md`
- [ ] Write `docs/architecture/overview.md`
- [ ] Write `docs/architecture/phases/phase0-contracts.md`
- [ ] Write `docs/architecture/phases/phase1-cache.md`
- [ ] Write `docs/architecture/phases/phase2-awareness.md`
- [ ] Write `docs/architecture/phases/phase3-healing.md` (NEW)
- [ ] Move `docs/SETUP.md` → `docs/guides/setup.md`
- [ ] Move `docs/CLIENT_SETUP_PROMPT.md` → `docs/guides/client-setup.md`
- [ ] Consolidate TEAMCITY.md → `docs/guides/teamcity.md`
- [ ] Move `QUICKSTART.md` → `docs/guides/quickstart.md`

**Phase 2: Add Deprecation Notices**
- [ ] Add deprecation header to root-level files (6 files)
- [ ] Create `repo-intelligence-mcp/README.md` (breadcrumb)
- [ ] Create `mindtrace-ai-runtime/README.md` (breadcrumb)
- [ ] Create `prompts/DEPRECATED.md`
- [ ] Create `frameworks-mcp/prompts/DEPRECATED.md`
- [ ] Create `mindtrace-ai-runtime/prompts/DEPRECATED.md`

**Phase 3: Update Main README**
- [ ] Change Phase 2.0 → Phase 3 in title/overview
- [ ] Add 5-tier healing architecture section
- [ ] Update artifacts list with healing artifacts
- [ ] Add documentation navigation section

**Phase 4: Verify**
- [ ] Test all internal links work
- [ ] Verify relative paths correct
- [ ] Check breadcrumbs work
- [ ] Verify old locations still accessible

## Success Criteria

✅ All existing links still work (backward compatible)
✅ New structure is navigable and organized
✅ Phase 3 is fully documented
✅ Clear deprecation notices guide users
✅ Main README reflects current state (Phase 3)
✅ No content deleted (only deprecated)

## What We're NOT Doing

❌ Deleting old files (keep for backward compatibility)
❌ Updating external references (future work)
❌ Consolidating prompt folders (deprecate only)
❌ Breaking any existing links

## Future Work (v2.0.0)

- Remove deprecated root-level files
- Remove duplicate prompt folders
- Update external references
- Clean up breadcrumb READMEs
