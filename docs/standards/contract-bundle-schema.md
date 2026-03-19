# BreakLine Contract Bundle Schema

**Version:** 1.0.0
**Status:** Canonical Standard

## Purpose

This document defines the **official contract bundle format** for BreakLine automation contracts.

All BreakLine-owned contract generators MUST emit this exact format.
Integrity validators MAY accept specific legacy variants temporarily, but canonical format is the official standard.

**Important:** Contract is the **identity layer** - compatibility is **surgical, not permissive**.

---

## Canonical Bundle Structure

### Directory Location

**Canonical:**
```
.mcp-contract/
```

**Legacy (compatibility fallback only):**
```
.mindtrace/contracts/
```

**Rule:** Prefer canonical first, fallback to legacy only if canonical missing.

---

## Canonical File Set

The following files constitute the **official contract bundle**:

```
.mcp-contract/
├── automation-contract.json      (required)
├── framework-pattern.json        (required)
├── selector-strategy.json        (required)
├── assertion-style.json          (required)
├── page-key-policy.json          (required)
├── repo-topology.json            (required)
├── wrapper-discovery.json        (required)
└── contract.fingerprint.sha256   (required)
```

**All files required.** Missing files = invalid contract.

---

## Canonical Fingerprint File

**Canonical:**
```
contract.fingerprint.sha256
```

**Content format:**
- Single line
- 64 hex characters (SHA-256)
- No whitespace except optional trailing newline
- Lowercase hex

**Legacy variants (narrow compatibility):**
- `automation-contract.hash` (if canonical missing)

**Rule:** Prefer `contract.fingerprint.sha256` first, accept `automation-contract.hash` as surgical fallback only.

---

## Canonical Field Schema: automation-contract.json

### Top-Level Structure

```json
{
  "schemaVersion": "1.0.0",
  "contractVersion": "1.0.0",
  "generated_by": {
    "name": "repo-intelligence-mcp",
    "version": "0.1.0"
  },
  "framework": "playwright",
  "pages": [...],
  "common": {...}
}
```

### Required Fields

| Field | Type | Purpose |
|-------|------|---------|
| `schemaVersion` | string | Schema evolution version |
| `contractVersion` | string | Contract bundle version |
| `generated_by` | object | Provenance information |
| `framework` | string | Test framework identifier |
| `pages` | array | Page specifications |

### Field Naming Convention

**Canonical casing:**
- `schemaVersion` (camelCase)
- `contractVersion` (camelCase)
- `generated_by` (snake_case for legacy compatibility)
- `framework` (lowercase)

**Do NOT use:**
- `schema_version` (snake_case variant)
- `contract_version` (snake_case variant)
- Alternate spellings or abbreviations

---

## Canonical Field Schema: Other Contract Files

Each contract file should include:

```json
{
  "schemaVersion": "1.0.0",
  "$schema": "https://schemas.breakline.dev/...",
  ...
}
```

All contract files should:
- Include `schemaVersion` for evolution tracking
- Use consistent camelCase for field names
- Follow JSON schema standards

---

## Architecture Principles

### Write Strictly (Contract Generators)

**Contract generators MUST:**
- Write ONLY to canonical directory (`.mcp-contract/`)
- Emit ONLY canonical file names
- Include ALL required files
- Use ONLY canonical field names
- Write ONLY canonical fingerprint file name

**Do NOT:**
- Write to legacy directory
- Emit legacy file name variants
- Use non-canonical field names
- Mix canonical and legacy formats

### Read with Surgical Compatibility (Integrity Validators)

**Allowed compatibility fallbacks:**
1. Directory: `.mindtrace/contracts/` if `.mcp-contract/` missing
2. Fingerprint file: `automation-contract.hash` if `contract.fingerprint.sha256` missing
3. Limited field name variants (to be specified explicitly)

**NOT allowed:**
- Arbitrary directory locations
- Arbitrary file name variations
- Broad "anything goes" field parsing
- Ambiguous bundle formats

**Pattern:**
```typescript
// Prefer canonical, NARROW surgical fallback
const contractDir =
  existsSync('.mcp-contract/') ? '.mcp-contract/' :        // ← CANONICAL
  existsSync('.mindtrace/contracts/') ? '.mindtrace/contracts/' : // ← LEGACY (surgical)
  null; // ← REJECT (no broad searching)
```

---

## Why Contract Is Stricter Than Cache

| Aspect | Cache | Contract |
|--------|-------|----------|
| **Role** | Supporting/derived | Foundational/identity |
| **Sensitivity** | Medium | High |
| **Compatibility** | Broad (temporary) | Surgical (narrow) |
| **Strictness** | Moderate | High |
| **Permissiveness** | More forgiving | Less forgiving |

**Principle:** Contract is the **root identity layer** - be surgical, not permissive.

---

## Validation Rules

A contract bundle is valid if:

1. ✅ Located in canonical directory (or legacy fallback)
2. ✅ ALL required files present
3. ✅ Fingerprint file present with valid SHA-256
4. ✅ All JSON files parse successfully
5. ✅ All required fields present in each file
6. ✅ `schemaVersion` matches known version
7. ✅ Fingerprint matches actual content hash

---

## Legacy Compatibility Policy

### Supported Legacy Variants (Surgical)

| Legacy Item | Canonical Replacement | Status |
|-------------|----------------------|--------|
| `.mindtrace/contracts/` | `.mcp-contract/` | Fallback allowed |
| `automation-contract.hash` | `contract.fingerprint.sha256` | Fallback allowed |

### NOT Supported

- Arbitrary directory names
- Partial file sets
- Non-standard file names (beyond specified fallbacks)
- Broad field name variations

**Compatibility is surgical, not permissive.**

---

## Evolution Strategy

### Adding New Required Files
1. Increment `contractVersion` (1.1.0)
2. Document in canonical file set
3. Provide migration tools for existing contracts

### Changing Schema
1. Increment `schemaVersion` (2.0.0)
2. Update integrity validators to handle multiple versions
3. Provide clear migration path

### Deprecating Legacy Variants
1. Warn when legacy variants detected
2. Set sunset timeline
3. Eventually enforce canonical-only in strict mode

### Strict Mode (Future)

When enabled, contract integrity will:
- Reject legacy directory
- Reject legacy fingerprint file name
- Require exact canonical bundle
- Enforce strict field naming

---

## Contract Fingerprint Calculation

The canonical fingerprint is calculated as:

```bash
# Deterministic hash of contract bundle
sha256sum \
  automation-contract.json \
  framework-pattern.json \
  selector-strategy.json \
  assertion-style.json \
  page-key-policy.json \
  repo-topology.json \
  wrapper-discovery.json \
  | sha256sum
```

**Critical:** Hash must be deterministic and reproducible.

---

## References

- **Canonical location:** `.mcp-contract/`
- **Generator:** `@mindtrace/repo-intelligence-mcp/generateContractBundle`
- **Validator:** `@mindtrace/integrity-gates/verifyContractIntegrity`
- **Related:** `cache-metadata-schema.md`

---

**Last updated:** 2026-03-19
**Maintained by:** BreakLine Core Team

**Note:** Contract is the identity layer - stricter than cache by design.
