import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

function resolveMindtraceContractsPackageRoot() {
  const require = createRequire(import.meta.url);
  const entry = require.resolve("@mindtrace/contracts");
  let dir = dirname(entry);

  // Prefer "contracts/" presence
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, "contracts");
    if (existsSync(candidate)) return dir;
    dir = dirname(dir);
  }

  return null;
}

function resolveContractsDir() {
  const envContracts = process.env.MINDTRACE_CONTRACTS_PATH;
  if (envContracts && existsSync(envContracts)) {
    return { contractsRoot: envContracts, contractsDir: envContracts, source: "env:MINDTRACE_CONTRACTS_PATH" };
  }

  const pkgRoot = resolveMindtraceContractsPackageRoot();
  if (!pkgRoot) throw new Error("Could not resolve @mindtrace/contracts package root");
  const dir = join(pkgRoot, "contracts");
  if (!existsSync(dir)) throw new Error(`Expected contracts dir missing: ${dir}`);

  return { contractsRoot: pkgRoot, contractsDir: dir, source: "@mindtrace/contracts" };
}

const { contractsRoot, contractsDir, source } = resolveContractsDir();
const schemaPath = join(contractsDir, "schemas", "locator-manifest.schema.json");

console.log(`✅ contractsRoot: ${contractsRoot}`);
console.log(`✅ contractsDir:  ${contractsDir}`);
console.log(`✅ source:        ${source}`);

if (!existsSync(schemaPath)) {
  console.error(`❌ Missing expected schema: ${schemaPath}`);
  process.exit(1);
}

const raw = readFileSync(schemaPath, "utf8");
const json = JSON.parse(raw);
if (!json || json.type !== "object") {
  console.error("❌ Schema JSON looks wrong (expected type=object).");
  process.exit(1);
}

console.log(`✅ Found schema: locator-manifest.schema.json (bytes=${raw.length})`);
console.log("✅ Smoke test passed (shared-package contract resolution works).");
