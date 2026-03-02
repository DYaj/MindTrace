import { scanRepo } from "../tools/scanRepo.js";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const root = process.argv[2] || process.cwd();
  const topology = await scanRepo({ rootPath: root });
  const outDir = path.join(root, ".mcp-contract");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "repo-topology.json"), JSON.stringify(topology, null, 2));
  console.log("Wrote:", path.join(outDir, "repo-topology.json"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
