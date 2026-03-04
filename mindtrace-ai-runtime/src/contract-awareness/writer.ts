// mindtrace-ai-runtime/src/contract-awareness/writer.ts
//
// Phase 2.0: Contract-Awareness Module — Writer
// Atomic write with canonical JSON for determinism

import { mkdirSync, writeFileSync, renameSync, existsSync, rmSync } from "fs";
import { join } from "path";
import type { RuntimeStrategyContext } from "./types.js";

/**
 * Recursively sort object keys for canonical JSON output.
 *
 * This ensures deterministic serialization:
 * - Same input always produces byte-identical output
 * - Object keys sorted alphabetically at all nesting levels
 * - Arrays and primitives preserved as-is
 *
 * @param obj - Any JSON-serializable value
 * @returns Same value with all object keys sorted
 */
function canonicalSort(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(canonicalSort);
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = canonicalSort((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Write contract awareness artifact to runs/<runId>/artifacts/ directory.
 *
 * Behavior:
 * - Creates artifacts directory if it doesn't exist
 * - Uses atomic write (temp file + rename) to prevent corruption on crash
 * - Uses canonical JSON (sorted keys) for deterministic output
 * - No timestamps (removed generatedAt for determinism)
 * - Authority boundary: writes ONLY to runs/ artifacts, never to contract dir
 *
 * Output schema:
 * {
 *   "schema_version": "0.1.0",
 *   "context": RuntimeStrategyContext
 * }
 *
 * @param args - { artifactsDir: string, context: RuntimeStrategyContext }
 */
export function writeContractAwarenessArtifact(args: {
  artifactsDir: string;
  context: RuntimeStrategyContext;
}): void {
  // Ensure artifacts directory exists
  if (!existsSync(args.artifactsDir)) {
    mkdirSync(args.artifactsDir, { recursive: true });
  }

  const output = {
    schema_version: "0.1.0",
    context: args.context,
  };

  // Canonical JSON: sort all keys recursively
  const canonical = canonicalSort(output);

  // Atomic write: temp file + rename
  const targetPath = join(args.artifactsDir, "contract-awareness.json");
  const tempPath = `${targetPath}.tmp.${Date.now()}`;

  try {
    writeFileSync(tempPath, JSON.stringify(canonical, null, 2), "utf-8");
    renameSync(tempPath, targetPath);
  } catch (error) {
    // Clean up temp file on error
    if (existsSync(tempPath)) {
      rmSync(tempPath);
    }
    throw error;
  }
}
