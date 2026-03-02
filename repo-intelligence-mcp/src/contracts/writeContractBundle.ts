import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";

/**
 * Stable JSON stringify:
 * - sorts object keys recursively
 * - keeps array order as provided (caller must sort arrays where order isn't meaningful)
 */
function stableStringify(v: any): string {
  const seen = new WeakSet();

  const norm = (x: any): any => {
    if (x === null || x === undefined) return x;
    if (typeof x !== "object") return x;

    if (seen.has(x)) return "[Circular]";
    seen.add(x);

    if (Array.isArray(x)) return x.map(norm);

    const out: Record<string, any> = {};
    for (const k of Object.keys(x).sort()) out[k] = norm(x[k]);
    return out;
  };

  return JSON.stringify(norm(v), null, 2) + "\n";
}

export type ContractBundleWriteResult = {
  ok: boolean;
  contractDir: string;
  filesWritten: string[];
  // optional: callers can write hash separately; this helper provides convenience if needed
  bundleSha256?: string;
};

export function writeContractBundle(opts: {
  contractDir: string;
  files: Record<string, unknown>; // filename -> json object
  alsoWriteBundleHash?: boolean;
}): ContractBundleWriteResult {
  mkdirSync(opts.contractDir, { recursive: true });

  const names = Object.keys(opts.files).sort(); // deterministic
  const filesWritten: string[] = [];

  // For optional bundle hash: hash over (filename + stable json)
  const hasher = crypto.createHash("sha256");

  for (const name of names) {
    const p = join(opts.contractDir, name);
    const raw = stableStringify(opts.files[name]);

    writeFileSync(p, raw, "utf-8");
    filesWritten.push(p);

    hasher.update(name, "utf-8");
    hasher.update("\n", "utf-8");
    hasher.update(raw, "utf-8");
    hasher.update("\n", "utf-8");
  }

  if (opts.alsoWriteBundleHash) {
    const hash = hasher.digest("hex");
    const hashPath = join(opts.contractDir, "automation-contract.hash");
    writeFileSync(hashPath, hash + "\n", "utf-8");
    filesWritten.push(hashPath);
    return { ok: true, contractDir: opts.contractDir, filesWritten, bundleSha256: hash };
  }

  return { ok: true, contractDir: opts.contractDir, filesWritten };
}
