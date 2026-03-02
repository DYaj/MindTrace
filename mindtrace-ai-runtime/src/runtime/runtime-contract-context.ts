// mindtrace-ai-runtime/src/runtime/runtime-contract-context.ts
//
// Phase 2.3 (additive):
// Runtime consumption proof: resolve contract context (read-only) and write a runtime-facing artifact.
// Non-goals:
// - No governance changes
// - No gating changes
// - No required contract presence (policy governs that)

import { writeFileSync } from "fs";
import { join } from "path";
import { resolveRuntimeContractContext } from "./contract-plumbing.js";

export function writeRuntimeContractContextArtifact(args: { artifactsDir: string }) {
  const ctx = resolveRuntimeContractContext({ artifactsDir: args.artifactsDir });

  const out = {
    schema_version: "0.1.0",
    generatedAt: new Date().toISOString(),
    context: ctx,
  };

  const p = join(args.artifactsDir, "runtime-contract-context.json");
  writeFileSync(p, JSON.stringify(out, null, 2), "utf-8");
}
