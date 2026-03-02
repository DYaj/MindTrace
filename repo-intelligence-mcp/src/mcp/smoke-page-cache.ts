import { scanRepo } from "../tools/scanRepo.js";
import { buildPageSemanticCache } from "../tools/buildPageCache.js";

async function main() {
  const repoRoot = process.argv[2] || process.cwd();

  const topology = await scanRepo({ rootPath: repoRoot });

  const out = buildPageSemanticCache({ repoRoot, topology });

  console.log("Phase 1 page cache generated:");
  console.log(" - pages:", out.summary.counts.pages);
  console.log(" - routes:", out.summary.counts.routes);
  console.log(" - stableIds:", out.summary.counts.stableIds);
  console.log(" - roles:", out.summary.counts.roles);
  console.log(" - labels:", out.summary.counts.labels);
  console.log(" - placeholders:", out.summary.counts.placeholders);
  console.log(" - anchors:", out.summary.counts.anchors);
  console.log(" - interactionTargets:", out.summary.counts.interactionTargets);
  console.log("Written:");
  for (const p of out.written) console.log(" -", p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
