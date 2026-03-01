// mindtrace-ai-runtime/src/runtime/contract-loader.ts
import fs from "fs";
import path from "path";

// Safe interop: some builds expose CJS namespace objects under NodeNext ESM.
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";

const Ajv: any = (AjvImport as any)?.default ?? (AjvImport as any);
const addFormats: any = (addFormatsImport as any)?.default ?? (addFormatsImport as any);

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

  // Optional: manifest may not exist in some runs; allow pipeline to proceed deterministically.
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

  return manifestUnknown as LocatorManifest;
}
