import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";

function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Canonical list of files included in contract fingerprint.
 * Order: Alphabetically sorted (deterministic).
 * Excludes: contract.meta.json (has timestamp), automation-contract.hash (is the hash).
 */
export const FINGERPRINT_FILES = [
  "assertion-style.json",
  "automation-contract.json",
  "framework-pattern.json",
  "page-key-policy.json",
  "repo-topology.json",
  "selector-strategy.json",
  "wrapper-discovery.json"
] as const;

export type FingerprintContractInput = {
  contractDir: string;             // default: ".mcp-contract" from caller
  includeFiles?: string[];         // if omitted: a safe default set
  outputFile?: string;             // default: "automation-contract.hash"
};

export type FingerprintContractResult = {
  ok: boolean;
  hash_algo: "sha256";
  fingerprint: string;
  inputs: string[];
  outputPath: string;
  warnings?: string[];
};

const DEFAULT_FILES = [
  "automation-contract.json",
  "framework-pattern.json",
  "selector-strategy.json",
  "assertion-style.json",
  "page-key-policy.json",
  "repo-topology.json",
  "contract.meta.json"
];

export async function fingerprintContract(input: FingerprintContractInput): Promise<FingerprintContractResult> {
  const contractDir = input.contractDir;
  const include = (input.includeFiles?.length ? input.includeFiles : DEFAULT_FILES).slice().sort();

  const warnings: string[] = [];
  const hasher = crypto.createHash("sha256");
  const used: string[] = [];

  for (const rel of include) {
    const p = join(contractDir, rel);
    if (!existsSync(p)) {
      warnings.push(`MISSING:${toPosix(rel)}`);
      continue;
    }
    const raw = readFileSync(p, "utf-8");
    used.push(toPosix(rel));
    hasher.update(toPosix(rel), "utf-8");
    hasher.update("\n", "utf-8");
    hasher.update(raw, "utf-8");
    hasher.update("\n", "utf-8");
  }

  const fingerprint = hasher.digest("hex");
  const outName = input.outputFile ?? "automation-contract.hash";
  const outPath = join(contractDir, outName);

  writeFileSync(outPath, fingerprint + "\n", "utf-8");

  return {
    ok: true,
    hash_algo: "sha256",
    fingerprint,
    inputs: used,
    outputPath: toPosix(outPath),
    warnings: warnings.length ? warnings : undefined
  };
}
