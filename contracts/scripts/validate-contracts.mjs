import fs from "fs";
import path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

function validate(schemaPath, dataPath) {
  const schema = JSON.parse(fs.readFileSync(schemaPath));
  const data = JSON.parse(fs.readFileSync(dataPath));
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    console.error("Validation failed:", dataPath);
    console.error(validate.errors);
    process.exit(1);
  }

  console.log("Valid:", dataPath);
}

validate(
  "./contracts/schemas/locator-manifest.schema.json",
  "./contracts/examples/locator-manifest.json"
);
