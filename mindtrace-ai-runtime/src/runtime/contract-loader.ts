import fs from "fs";
import path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export type LocatorManifest = {
  meta: {
    schema_version: string;
    generated_at: string;
  };
  elements: Array<{
    element_id: string;
    locators: Array<{
      strategy: string;
      value: string;
    }>;
  }>;
};

export function loadAndValidateLocatorManifest(repoRoot: string): LocatorManifest | null {
  const manifestPath = path.join(repoRoot, "contracts", "examples", "locator-manifest.json");
  const schemaPath = path.join(repoRoot, "contracts", "schemas", "locator-manifest.schema.json");

  // Optional feature: if manifest doesn't exist, skip enforcement (Phase 2 can tighten later)
  if (!fs.existsSync(manifestPath)) return null;

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Missing schema file: ${schemaPath}`);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8")) as unknown;
  const manifestUnknown = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as unknown;

  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);

  const validate = ajv.compile(schema as any);
  const valid = validate(manifestUnknown);

  if (!valid) {
    throw new Error(
      "Locator manifest validation failed: " + JSON.stringify(validate.errors, null, 2)
    );
  }

  // Safe to cast AFTER schema validation
  return manifestUnknown as LocatorManifest;
}
