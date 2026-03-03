import { promises as fs } from "fs";
import path from "path";
import { validateAgainstSchema } from "../core/validation.js";
import { computeContractFingerprint, FINGERPRINT_FILES } from "../tools/fingerprintContract.js";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export async function validateContractBundle(contractDir: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const required = [...FINGERPRINT_FILES, "contract.meta.json"];

  // Check all required files exist
  for (const file of required) {
    try {
      await fs.access(path.join(contractDir, file));
    } catch {
      errors.push(`Missing required file: ${file}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate each schema
  for (const file of required) {
    try {
      const content = await fs.readFile(path.join(contractDir, file), "utf-8");
      const data = JSON.parse(content);

      const schemaResult = validateAgainstSchema(file, data);
      if (!schemaResult.valid) {
        // Phase 0: Treat missing schemas as warnings, not errors
        const hasNoSchema = schemaResult.errors.some(e => e.includes("No schema found"));
        if (hasNoSchema) {
          warnings.push(...schemaResult.errors);
        } else {
          // Prefix errors with filename for better debugging
          errors.push(...schemaResult.errors.map(e => `${file}: ${e}`));
        }
      }
    } catch (error) {
      errors.push(`Failed to read/parse ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Compute fingerprint (read-only)
  const fpResult = computeContractFingerprint(contractDir, "strict");

  if (!fpResult.ok) {
    errors.push(`Fingerprint validation failed: ${fpResult.error}`);
    return { valid: false, errors, warnings };
  }

  // Verify hash file matches computed fingerprint
  const hashPath = path.join(contractDir, "contract.fingerprint.sha256");
  try {
    const storedHash = await fs.readFile(hashPath, "utf-8");
    if (storedHash.trim() !== fpResult.fingerprint) {
      errors.push(`Hash mismatch: stored=${storedHash.trim()}, computed=${fpResult.fingerprint}`);
    }
  } catch (error) {
    errors.push(`Missing or unreadable contract.fingerprint.sha256 file: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
