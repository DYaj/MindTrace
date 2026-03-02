import fs from "node:fs";
import path from "node:path";
import { scanRepo } from "../tools/scanRepo.js";
import { detectFramework, inferStructure, detectLocatorStyle, detectAssertionStyle } from "../tools/infer.js";
import { discoverWrappers } from "../tools/discoverWrappers.js";
import { generateContractFiles } from "../tools/generateContract.js";

async function main() {
  const repoRoot = process.argv[2] || process.cwd();

  const topology = await scanRepo({ rootPath: repoRoot });

  const fw = detectFramework(topology);
  const st = inferStructure(topology);
  const loc = detectLocatorStyle(topology);
  const asrt = detectAssertionStyle(topology);

  const wrappers = discoverWrappers({ repoRoot, topology });

  // Force write wrapper discovery file (deterministic contract artifact)
  const outDir = path.join(repoRoot, ".mcp-contract");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "wrapper-discovery.json"), JSON.stringify(wrappers, null, 2));

  const out = generateContractFiles({
    repoRoot,
    topology,
    framework: fw,
    structure: st,
    locatorStyle: loc,
    assertionStyle: asrt,
    wrappers
  });

  const summary = {
    framework: fw,
    structure: st,
    locatorStyle: loc,
    assertionStyle: asrt,
    wrappers: {
      locatorWrappers: wrappers.locatorWrappers.length,
      assertionWrappers: wrappers.assertionWrappers.length,
      retrySignals: wrappers.retrySignals.length,
      warnings: wrappers.warnings
    },
    written: [...out.written, ".mcp-contract/wrapper-discovery.json"]
  };

  fs.writeFileSync(path.join(outDir, "phase0-summary.json"), JSON.stringify(summary, null, 2));

  console.log("Phase 0 contract generated:");
  for (const p of out.written) console.log(" -", p);
  console.log(" - .mcp-contract/wrapper-discovery.json");
  console.log(" - .mcp-contract/phase0-summary.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
