import fs from "fs";
import path from "path";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajvDraft7 = new Ajv({ allErrors: true, strict: true });
addFormats(ajvDraft7);

const ajv2020 = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv2020);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function pickValidatorForSchema(schema) {
  const s = schema?.$schema || "";
  if (typeof s === "string" && s.includes("draft-07")) return ajvDraft7;
  // default to 2020-12 for everything else (including your new DoD schema)
  return ajv2020;
}

function validate(schemaPath, dataPath) {
  const schemaAbs = path.resolve(schemaPath);
  const dataAbs = path.resolve(dataPath);

  const schema = readJson(schemaAbs);
  const data = readJson(dataAbs);

  const ajv = pickValidatorForSchema(schema);
  const validateFn = ajv.compile(schema);
  const valid = validateFn(data);

  if (!valid) {
    console.error("Validation failed:", dataAbs);
    console.error(validateFn.errors);
    process.exit(1);
  }

  console.log("Valid:", dataAbs);
}

// Existing contract
validate(
  "./contracts/schemas/locator-manifest.schema.json",
  "./contracts/examples/locator-manifest.json"
);

// New compliance contract
validate(
  "./contracts/schemas/compliance-definition-of-done.schema.json",
  "./contracts/compliance-definition-of-done.json"
);
