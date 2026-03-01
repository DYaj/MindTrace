import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
// Safe ESM/CJS interop (NodeNext) for AJV + formats
import AjvDraft7Import from "ajv";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
const AjvDraft7 = AjvDraft7Import?.default ?? AjvDraft7Import;
const Ajv2020 = Ajv2020Import?.default ?? Ajv2020Import;
const addFormats = addFormatsImport?.default ?? addFormatsImport;
export function readJsonFile(p) {
    return JSON.parse(readFileSync(p, "utf8"));
}
export function listSchemaFiles(contractsDir) {
    const schemasDir = join(contractsDir, "schemas");
    if (!existsSync(schemasDir))
        return [];
    return readdirSync(schemasDir).filter((f) => f.endsWith(".schema.json")).sort();
}
function pickAjvForSchema(schema) {
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
export function validateAgainstSchema(schema, data) {
    const ajv = pickAjvForSchema(schema);
    const validateFn = ajv.compile(schema);
    const ok = validateFn(data);
    if (ok)
        return { ok: true };
    return { ok: false, errors: validateFn.errors };
}
/**
 * Convenience: validate by schema file path.
 */
export function validateFilePair(schemaPath, dataPath) {
    const schema = readJsonFile(schemaPath);
    const data = readJsonFile(dataPath);
    return validateAgainstSchema(schema, data);
}
