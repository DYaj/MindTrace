// mindtrace-ai-runtime/src/runtime/get-runtime-contract-context.ts
//
// Phase 2.3.2 (additive):
// Provide a stable API to fetch resolved contract context for runtime consumers.
// Non-goals:
// - No governance changes
// - No gating changes
// - No required contract presence

import { resolveRuntimeContractContext } from "./contract-plumbing.js";
import type { RuntimeContractContext } from "./contract-plumbing.js";

export function getRuntimeContractContext(args: { artifactsDir: string }): RuntimeContractContext {
  return resolveRuntimeContractContext({ artifactsDir: args.artifactsDir });
}
