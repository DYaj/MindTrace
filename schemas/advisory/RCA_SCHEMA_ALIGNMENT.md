# RCA Schema Alignment Decision

**Date:** 2026-03-10
**Decision By:** Engineering review during GSL Layer 1 implementation
**Status:** Resolved

---

## Issue

Two RCA schemas were identified in the codebase:

1. **Legacy Schema:** `mindtrace-ai-runtime/schemas/root-cause-summary.schema.json`
   - Fields: `category`, `confidence`, `isFlaky`, `reasoning`, `suggestedActions`, `affectedTests`
   - Referenced in: compliance-definition-of-done.json, policy.yml
   - Status: Planned but never fully implemented

2. **New GSL Schema:** `schemas/advisory/rca-report.schema.json`
   - Fields: `schemaVersion`, `artifactClass`, `runId`, `summary`, `recommendations`, `confidence`, `evidence`
   - Part of: GSL Layer 1 (Schema Validation Gates)
   - Purpose: Advisory output for Claude Skills "Skill 2: Failure RCA Generator"

This created potential confusion and inconsistency.

---

## Options Considered

### Option A: Replace with Enhanced Schema (CHOSEN)
Update new schema to include structured fields from old schema while keeping new GSL metadata.

**Pros:**
- Best of both worlds: GSL architecture + structured classification
- Machine-readable failure categories enable better analysis
- `isFlaky` flag is critical for governance decisions
- Comprehensive RCA aligns with Claude Skills Skill 2 goals
- Clean migration path (old schema minimally used)

**Cons:**
- Requires updating any code expecting old field names
- Slightly more complex schema

### Option B: Keep as Different Artifacts
Document that these are distinct artifacts for different purposes.

**Pros:**
- No changes needed
- Backward compatible

**Cons:**
- Semantic overlap creates confusion
- Duplicated effort (two RCA mechanisms)
- Violates DRY principle
- Unclear which to use when

### Option C: Align Field Names Only
Rename new fields to match old schema exactly.

**Pros:**
- Backward compatible field names

**Cons:**
- Loses GSL metadata (`schemaVersion`, `artifactClass`)
- Loses improved field names (`summary` is clearer than `reasoning`)
- Doesn't leverage new architecture

---

## Decision: Option A (Enhanced Schema)

The new `schemas/advisory/rca-report.schema.json` now includes:

### From Legacy Schema:
- `category` (enum): Structured failure classification
- `isFlaky` (boolean): Critical for governance decisions
- `affectedTests` (array): Which tests are impacted

### From New GSL Schema:
- `schemaVersion`: Schema evolution support
- `artifactClass: "advisory"`: Clear authority boundary
- `runId` / `stepId`: Artifact provenance
- `summary`: Human-readable prose (replaces `reasoning`)
- `recommendations`: Actionable suggestions (replaces `suggestedActions`)
- `evidence`: Supporting data for RCA
- `detectedIssue`: Concise issue statement

### Combined Benefits:
- Machine-readable classification for analysis
- Human-readable narrative for developers
- GSL metadata for governance enforcement
- Comprehensive structure for Claude Skills Skill 2

---

## Field Mapping (Legacy → New)

| Legacy Field | New Field | Notes |
|--------------|-----------|-------|
| `category` | `category` | Preserved (enum unchanged) |
| `confidence` | `confidence` | Preserved (0.0-1.0) |
| `isFlaky` | `isFlaky` | Preserved (boolean) |
| `reasoning` | `summary` | Renamed for clarity |
| `suggestedActions` | `recommendations` | Renamed for consistency |
| `affectedTests` | `affectedTests` | Preserved |
| (none) | `schemaVersion` | Added for GSL |
| (none) | `artifactClass` | Added for GSL |
| (none) | `runId` / `stepId` | Added for provenance |
| (none) | `detectedIssue` | Added for conciseness |
| (none) | `evidence` | Added for supporting data |

---

## Migration Path

### For New Code:
Use `schemas/advisory/rca-report.schema.json` with all required fields.

### For Legacy References:
1. Update `compliance-definition-of-done.json` to reference new schema location
2. Update `policy.yml` artifact requirements if needed
3. Existing minimal usage (`frameworks/style1-native/runs/phase2-test/artifacts/root-cause-summary.json`) can be migrated during next artifact regeneration

### Backward Compatibility:
The new schema is a superset of the old schema. Code that reads old fields can continue to work if validators allow optional new fields.

---

## Related Documentation

- [GSL Design](../../docs/plans/2026-03-10-governance-safety-layer-design.md) - Layer 1: Schema Validation Gates
- [GSL Implementation](../../docs/plans/2026-03-10-governance-safety-layer-implementation.md) - Task 4: Define Advisory Schema - RCA Report
- [Claude Skills Architecture](../../mindtrace_claude_skills_architecture.md) - Skill 2: Failure RCA Generator

---

## Outcome

A single, comprehensive RCA schema that:
- Serves as authoritative advisory artifact for GSL
- Provides structured classification for machine analysis
- Includes human-readable narrative for developers
- Supports Claude Skills Skill 2 (Failure RCA Generator)
- Maintains governance metadata for audit trail

**Schema Location:** `schemas/advisory/rca-report.schema.json`
