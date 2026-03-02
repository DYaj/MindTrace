import { enrichPageCache } from "../tools/enrichPageCache.js";
import { resolve } from "path";

const repoRoot = resolve(process.argv[2] || process.cwd());
const out = enrichPageCache(repoRoot);

console.log("Phase 1.3 enrichment complete:");
console.log(JSON.stringify(out, null, 2));
