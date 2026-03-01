import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Safe ESM/CJS interop (NodeNext) for AJV + formats
import AjvDraft7Import from "ajv";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";

const AjvDraft7: any = (AjvDraft7Import as any)?.default ?? (AjvDraft7Import as any);
const Ajv2020: any = (Ajv2020Import as any)?.default ?? (Ajv2020Import as any);
const addFormats: any = (addFormatsImport as any)?.default ?? (addFormatsImport as any);

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: unknown };

export function readJsonFile<T = unknown>(p: string): T {
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

export function listSchemaFiles(contractsDir: string): string[] {
  const schemasDir = join(contractsDir, "schemas");
  if (!existsSync(schemasDir)) return [];
  return readdirSync(schemasDir).filter((f) => f.endsWith(".schema.json")).sort();
}

function pickAjvForSchema(schema: any) {
  const s = schema?.$schema || "";
  const isDraft7 = typeof s === "string" && s.includes("draft-07");

  const ajv = isDraft7
    ? new AjvDraft7({ allErrors: true, strict: true })
    : new Ajv2020({ allErrors: true, strict: true });

  addFormats(ajv);
  return ajv;
}

/**
 * Strict schema validation. Deterministic. CI-safe.
 */
export function validateAgainstSchema(schema: unknown, data: unknown): ValidationResult {
  const ajv = pickAjvForSchema(schema);
  const validateFn = ajv.compile(schema as any);
  const ok = validateFn(data);

  if (ok) return { ok: true };
  return { ok: false, errors: validateFn.errors };
}

/**
 * Convenience: validate by schema file path.
 */
export function validateFilePair(schemaPath: string, dataPath: string): ValidationResult {
  const schema = readJsonFile(schemaPath);
  const data = readJsonFile(dataPath);
  return validateAgainstSchema(schema, data);
}
