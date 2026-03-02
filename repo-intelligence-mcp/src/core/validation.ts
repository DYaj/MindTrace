import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({ allErrors: true, strict: true, validateSchema: false });
addFormats(ajv);

// Load all schemas on startup (shared/evidence MUST be first)
const SCHEMA_DIR = path.join(__dirname, "../schemas");
const SCHEMA_FILES = [
  "shared/evidence.schema.json", // Load shared first
  "automation-contract.schema.json",
  "page-key-policy.schema.json",
  "contract-meta.schema.json",
  "framework-pattern.schema.json",
  "selector-strategy.schema.json",
  "assertion-style.schema.json"
];

for (const schemaFile of SCHEMA_FILES) {
  const schema = JSON.parse(readFileSync(path.join(SCHEMA_DIR, schemaFile), "utf-8"));
  ajv.addSchema(schema);
}

export function validateAgainstSchema(filename: string, data: any): { valid: boolean; errors: string[] } {
  const schemaId = `mindtrace://schemas/${filename.replace(".json", ".schema.json")}`;
  const validate = ajv.getSchema(schemaId);

  if (!validate) {
    return { valid: false, errors: [`No schema found for ${filename}`] };
  }

  const valid = validate(data);

  if (!valid && validate.errors) {
    return {
      valid: false,
      errors: validate.errors.map((e) => `${e.instancePath} ${e.message}`)
    };
  }

  return { valid: true, errors: [] };
}
