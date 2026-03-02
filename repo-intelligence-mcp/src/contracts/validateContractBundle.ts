import { readFileSync, existsSync } from "fs";
import path from "path";
import { validateAgainstSchema } from "../core/validation.js";
import { computeContractFingerprint, FINGERPRINT_FILES } from "../tools/fingerprintContract.js";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateContractBundle(contractDir: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const required = [...FINGERPRINT_FILES, "contract.meta.json"];

  // Check all required files exist
  for (const file of required) {
    if (!existsSync(path.join(contractDir, file))) {
      errors.push(`Missing required file: ${file}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate each schema
  for (const file of required) {
    const content = readFileSync(path.join(contractDir, file), "utf-8");
    const data = JSON.parse(content);

    const schemaResult = validateAgainstSchema(file, data);
    if (!schemaResult.valid) {
      errors.push(...schemaResult.errors);
    }
  }

  // Compute fingerprint (read-only)
  const fpResult = computeContractFingerprint(contractDir, "strict");

  if (!fpResult.ok) {
    errors.push(`Fingerprint validation failed: ${fpResult.error}`);
    return { valid: false, errors, warnings };
  }

  // Verify hash file matches computed fingerprint
  const hashPath = path.join(contractDir, "automation-contract.hash");
  if (existsSync(hashPath)) {
    const storedHash = readFileSync(hashPath, "utf-8").trim();
    if (storedHash !== fpResult.fingerprint) {
      errors.push(`Hash mismatch: stored=${storedHash}, computed=${fpResult.fingerprint}`);
    }
  } else {
    errors.push("Missing automation-contract.hash file");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
