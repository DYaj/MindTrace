import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

function tryResolveFromRequire(requireFn, spec) {
  try {
    return requireFn.resolve(spec);
  } catch {
    return null;
  }
}

function resolvePackageRoot(pkgName) {
  const spec = `${pkgName}/package.json`;

  // 1) relative to this file
  const r1 = createRequire(import.meta.url);
  const p1 = tryResolveFromRequire(r1, spec);
  if (p1) return path.dirname(p1);

  // 2) relative to CWD
  try {
    const cwdUrl = pathToFileURL(path.join(process.cwd(), "package.json")).href;
    const r2 = createRequire(cwdUrl);
    const p2 = tryResolveFromRequire(r2, spec);
    if (p2) return path.dirname(p2);
  } catch {
    // ignore
  }

  // 3) manual walk up from CWD
  let cur = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(cur, "node_modules", ...pkgName.split("/"), "package.json");
    if (fs.existsSync(candidate)) return path.dirname(candidate);
    const parent = path.resolve(cur, "..");
    if (parent === cur) break;
    cur = parent;
  }

  return null;
}

function assertDir(p, label) {
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    throw new Error(`Missing ${label} dir: ${p}`);
  }
}

function readFileLen(p) {
  return fs.readFileSync(p, "utf8").length;
}

const promptpacksRoot = resolvePackageRoot("@mindtrace/promptpacks");
const contractsRoot = resolvePackageRoot("@mindtrace/contracts");

// IMPORTANT: if MINDTRACE_BASE_PATH is set, it will force fallback behavior.
// For this smoke, we prefer shared packages. Only use BASE if shared packages aren't found.
const base = process.env.MINDTRACE_BASE_PATH || "";

const promptsDir =
  (process.env.MINDTRACE_PROMPTS_PATH && process.env.MINDTRACE_PROMPTS_PATH) ||
  (promptpacksRoot ? path.join(promptpacksRoot, "prompts") : "") ||
  (base ? path.join(base, "prompts") : "");

const contractsDir =
  (process.env.MINDTRACE_CONTRACTS_PATH && process.env.MINDTRACE_CONTRACTS_PATH) ||
  (contractsRoot ? path.join(contractsRoot, "contracts") : "") ||
  (base ? path.join(base, "contracts") : "");

console.log(`✅ promptpacksRoot: ${promptpacksRoot || "(not found)"}`);
console.log(`✅ contractsRoot:   ${contractsRoot || "(not found)"}`);
console.log(`✅ Prompts dir:     ${promptsDir || "(not resolved)"}`);
console.log(`✅ Contracts dir:   ${contractsDir || "(not resolved)"}`);

if (!promptsDir) throw new Error("Could not resolve promptsDir (need @mindtrace/promptpacks or MINDTRACE_BASE_PATH).");
if (!contractsDir) throw new Error("Could not resolve contractsDir (need @mindtrace/contracts or MINDTRACE_BASE_PATH).");

assertDir(promptsDir, "prompts");
assertDir(contractsDir, "contracts");

const packs = fs
  .readdirSync(promptsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

console.log(`✅ Found packs: ${packs.join(", ")}`);

for (const pack of packs) {
  const mainPath = path.join(promptsDir, pack, "main.md");
  if (!fs.existsSync(mainPath)) throw new Error(`Missing ${pack}/main.md`);
  const len = readFileLen(mainPath);
  console.log(`✅ Pack OK: ${pack} (main.md length=${len})`);
}

console.log("✅ Smoke test passed (shared-package prompt resolution works).");
