import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const distCli = resolve(pkgRoot, "dist/mcp/cli.js");

console.log("✅ packageRoot:", pkgRoot);
console.log("✅ cli:", distCli);

if (!existsSync(distCli)) {
  console.error("❌ Missing dist/mcp/cli.js (run build first)");
  process.exit(1);
}

console.log("✅ Smoke test passed (orchestrator packaged CLI present).");
