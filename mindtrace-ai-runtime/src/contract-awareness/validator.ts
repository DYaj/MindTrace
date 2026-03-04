// mindtrace-ai-runtime/src/contract-awareness/validator.ts
//
// Phase 2.0: Contract-Awareness Module — Validator
// AJV schema validation + fingerprint verification

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";
import { join } from "path";
import type { LoadContractBundleResult, ContractValidationResult } from "./types";
import { createIssue } from "./helpers";

// In CommonJS (jest/ts-jest), __dirname is globally available
// In ESM runtime, we'd need import.meta.url, but for now we rely on CommonJS transpilation
// This is safe because ts-jest transforms to CommonJS where __dirname exists
declare const __dirname: string;

// Schema files copied from repo-intelligence-mcp at build-time
const SCHEMA_FILES: Record<string, string> = {
  "repo-topology.json": "repo-topology.schema.json",
  "selector-policy.json": "selector-policy.schema.json",
  "healing-policy.json": "healing-policy.schema.json",
  "wrapper-discovery.json": "wrapper-discovery.schema.json",
  "policy-decision.json": "policy-decision.schema.json",
  "meta.json": "meta.schema.json",
  "fingerprint.json": "fingerprint.schema.json",
};

/**
 * Initialize AJV with schemas loaded from local schemas directory.
 *
 * Schemas are copied from repo-intelligence-mcp/src/schemas/ at build-time
 * to avoid runtime path resolution into sibling packages.
 */
function initializeAjv(): Ajv {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateSchema: false, // Don't validate the schema itself (skip $schema meta-validation)
  });

  addFormats(ajv); // Enable format validation (date-time, uri, etc.)

  const schemasDir = join(__dirname, "schemas");

  for (const [contractFile, schemaFile] of Object.entries(SCHEMA_FILES)) {
    try {
      const schemaPath = join(schemasDir, schemaFile);
      const schemaContent = readFileSync(schemaPath, "utf-8");
      const schema = JSON.parse(schemaContent);
      ajv.addSchema(schema, contractFile);
    } catch (error) {
      // Schema missing - will cause validation failure via CA_SCHEMA_INVALID in validateContractBundle
    }
  }

  return ajv;
}

const ajv = initializeAjv();

/**
 * Validate all contract files against their AJV schemas.
 *
 * Behavior:
 * - For each file in the bundle, validate against its corresponding schema
 * - Accumulate all validation errors as CA_SCHEMA_INVALID issues
 * - Returns ok: true if all files pass validation, ok: false otherwise
 *
 * Schema mapping:
 * - repo-topology.json → repo-topology.schema.json
 * - selector-policy.json → selector-policy.schema.json
 * - etc.
 *
 * @param bundle - Loaded contract bundle (must be ok: true)
 * @returns ContractValidationResult with issues array
 */
export function validateContractBundle(
  bundle: Extract<LoadContractBundleResult, { ok: true }>
): ContractValidationResult {
  const issues = [];

  for (const [filename, content] of Object.entries(bundle.files)) {
    // Skip files without schemas
    if (!SCHEMA_FILES[filename]) continue;

    const validate = ajv.getSchema(filename);
    if (!validate) {
      // Schema not loaded (shouldn't happen if build-time copy succeeded)
      issues.push(
        createIssue("CA_SCHEMA_INVALID", `Schema not found for ${filename}`, {
          file: filename,
        })
      );
      continue;
    }

    const valid = validate(content);
    if (!valid) {
      issues.push(
        createIssue("CA_SCHEMA_INVALID", `Schema validation failed for ${filename}`, {
          file: filename,
          errors: validate.errors,
        })
      );
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

/**
 * Verify that the fingerprint hash in fingerprint.json matches the computed contract hash.
 *
 * Behavior:
 * - If fingerprint.json is missing: ok: true (no verification needed)
 * - If fingerprint.json exists: compare contractHash field with bundle.contractHash
 * - If mismatch: return CA_HASH_MISMATCH issue with ok: false
 *
 * @param bundle - Loaded contract bundle (must be ok: true)
 * @returns ContractValidationResult with issues array
 */
export function verifyFingerprint(
  bundle: Extract<LoadContractBundleResult, { ok: true }>
): ContractValidationResult {
  const fingerprint = bundle.files["fingerprint.json"];

  // No fingerprint file = no verification needed
  if (!fingerprint) {
    return { ok: true, issues: [] };
  }

  // Fingerprint should be an object with contractHash field
  if (typeof fingerprint !== "object" || fingerprint === null || !("contractHash" in fingerprint)) {
    return {
      ok: false,
      issues: [
        createIssue("CA_HASH_MISMATCH", "fingerprint.json missing contractHash field", {
          fingerprint,
        }),
      ],
    };
  }

  const storedHash = (fingerprint as { contractHash: unknown }).contractHash;

  if (storedHash !== bundle.contractHash) {
    return {
      ok: false,
      issues: [
        createIssue("CA_HASH_MISMATCH", "Contract hash mismatch", {
          expected: storedHash,
          actual: bundle.contractHash,
        }),
      ],
    };
  }

  return { ok: true, issues: [] };
}
