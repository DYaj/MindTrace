import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Deterministically write .mcp-contract/schemas/*.schema.json
 * from the in-repo source schemas (src/schemas/*).
 *
 * Writers MUST be stable:
 * - stable filenames
 * - stable JSON (as committed)
 */
export function writeSchemas(opts: {
  contractDir: string;
  schemas: Record<string, unknown>;
}): { ok: boolean; written: string[] } {
  const outDir = join(opts.contractDir, "schemas");
  mkdirSync(outDir, { recursive: true });

  const names = Object.keys(opts.schemas).sort(); // deterministic
  const written: string[] = [];

  for (const name of names) {
    const p = join(outDir, name);
    const raw = JSON.stringify(opts.schemas[name], null, 2) + "\n";
    writeFileSync(p, raw, "utf-8");
    written.push(p);
  }

  return { ok: true, written };
}
