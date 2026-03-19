# BreakLine Cache Metadata Schema

**Version:** 1.0.0
**Status:** Canonical Standard

## Purpose

This document defines the **official cache metadata format** for BreakLine page detection cache.

All BreakLine-owned cache writers MUST emit this exact format.
Integrity validators MAY accept legacy formats temporarily for compatibility, but the canonical format is the official standard.

---

## Canonical Schema

### Required Fields

```json
{
  "schemaVersion": "1.0.0",
  "cacheVersion": "v1",
  "contractSha256": "abc123...",
  "pages_count": 3
}
```

### Optional Fields

```json
{
  "schemaVersion": "1.0.0",
  "cacheVersion": "v1",
  "contractSha256": "abc123...",
  "pages_count": 3,
  "pages": [
    {
      "pageId": "login",
      "sourcePath": "src/pages/login.tsx",
      "inferredName": "Login",
      "confidence": 1.0
    }
  ],
  "cache_format": "semantic-v1",
  "generated_by": {
    "name": "repo-intelligence-mcp",
    "version": "0.1.0"
  }
}
```

---

## Field Definitions

### `schemaVersion` (string, required)
- **Purpose:** Version of this metadata schema
- **Format:** Semantic version (e.g., `"1.0.0"`)
- **Allows safe evolution:** Future versions can change schema safely

### `cacheVersion` (string, required)
- **Purpose:** Cache format version identifier
- **Format:** `"v1"`, `"v2"`, etc.
- **Used by:** Integrity gates to validate cache compatibility

### `contractSha256` (string, required)
- **Purpose:** Contract fingerprint this cache was built from
- **Format:** Full SHA-256 hash (64 hex characters)
- **Used by:** Drift detection to verify cache-contract binding

### `pages_count` (number, required)
- **Purpose:** Number of pages in this cache
- **Format:** Non-negative integer
- **Note:** If `pages` array exists, MUST equal `pages.length`

### `pages` (array, optional)
- **Purpose:** Summary of cached pages
- **Format:** Array of page objects with `pageId`, `sourcePath`, `inferredName`, `confidence`
- **When included:** Provides quick reference without reading individual page files

### `cache_format` (string, optional)
- **Purpose:** Internal cache structure format identifier
- **Examples:** `"semantic-v1"`, `"flat-v1"`

### `generated_by` (object, optional)
- **Purpose:** Provenance - which tool generated this cache
- **Fields:** `name` (string), `version` (string)

---

## Architecture Principles

### Write Strictly
**All BreakLine cache writers MUST:**
- Emit ONLY canonical field names
- Use exact casing and naming
- Include all required fields
- Follow this schema exactly

**Do NOT:**
- Write legacy field names (`contractBinding`, `contract_hash`)
- Write non-standard variations
- Mix canonical and legacy formats

### Read Compatibly
**Integrity validators MAY:**
- Accept legacy field names as temporary compatibility fallback
- Prefer canonical fields when present
- Warn or log when legacy fields are used
- Eventually support strict mode requiring canonical only

**Pattern:**
```typescript
// Prefer canonical, fallback to legacy
const contractHash = meta.contractSha256 || meta.contractBinding || meta.contract_hash;
//                         ↑ canonical      ↑ legacy compat      ↑ legacy compat
```

---

## Legacy Field Names (Compatibility Only)

These field names are **NOT canonical** but MAY be accepted temporarily:

| Legacy Field | Canonical Replacement | Status |
|--------------|----------------------|--------|
| `contractBinding` | `contractSha256` | Deprecated |
| `contract_hash` | `contractSha256` | Deprecated |
| `pages.length` (derived) | `pages_count` | Use explicit count |

**Compatibility policy:**
- Read: Accept for now, prefer canonical
- Write: Never emit legacy fields
- Future: Strict mode will reject legacy fields

---

## Evolution Strategy

### Adding New Fields
1. Add to "Optional Fields" section
2. Increment `schemaVersion` minor version (1.1.0)
3. Old readers ignore unknown fields (forward compatible)

### Breaking Changes
1. Increment `schemaVersion` major version (2.0.0)
2. Update integrity gates to handle multiple schema versions
3. Provide migration path for old caches

### Strict Mode (Future)
When enabled, integrity gates will:
- Reject legacy field names
- Require all canonical fields
- Enforce exact schema compliance

---

## Validation

Cache metadata is valid if:
1. ✅ All required fields present with correct types
2. ✅ `contractSha256` is valid SHA-256 hash (64 hex chars)
3. ✅ `pages_count` is non-negative integer
4. ✅ If `pages` array exists, `pages.length === pages_count`
5. ✅ `schemaVersion` matches a known version

---

## References

- **Cache location:** `.mcp-cache/v1/meta.json`
- **Writer:** `@mindtrace/repo-intelligence-mcp/buildPageCache`
- **Reader:** `@mindtrace/integrity-gates/verifyCacheIntegrity`

---

**Last updated:** 2026-03-19
**Maintained by:** BreakLine Core Team
