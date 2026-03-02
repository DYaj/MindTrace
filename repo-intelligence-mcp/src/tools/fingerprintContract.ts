import { existsSync, readFileSync, writeFileSync, unlinkSync, renameSync } from "fs";
import { join } from "path";
import path from "path";
import crypto from "crypto";
import { canonicalStringify } from "../core/deterministic.js";
import { toPosix as toPosixUtil } from "../core/normalization.js";

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

/**
 * Compute deterministic fingerprint of contract files.
 *
 * @param contractDir - Directory containing contract JSON files
 * @param mode - "strict" (fail if files missing) or "best_effort" (use available files)
 * @returns Success with fingerprint and file list, or failure with error message
 */
export function computeContractFingerprint(
  contractDir: string,
  mode: "strict" | "best_effort" = "best_effort"
): { ok: true; fingerprint: string; files: string[] } | { ok: false; error: string } {
  const required = [...FINGERPRINT_FILES];

  const available: string[] = [];
  const missing: string[] = [];

  for (const file of required) {
    const filePath = path.join(contractDir, file);
    if (existsSync(filePath)) {
      available.push(file);
    } else {
      missing.push(file);
    }
  }

  if (mode === "strict" && missing.length > 0) {
    return { ok: false, error: `Missing required files: ${missing.join(", ")}` };
  }

  if (available.length === 0) {
    return { ok: false, error: "No contract files found" };
  }

  const sortedFiles = available.slice().sort((a, b) => a.localeCompare(b));

  // Include filename in hash stream to bind content to specific file
  const hasher = crypto.createHash("sha256");

  for (const file of sortedFiles) {
    try {
      const content = readFileSync(path.join(contractDir, file), "utf-8");
      const parsed = JSON.parse(content);

      hasher.update(toPosixUtil(file) + "\n"); // Bind filename
      hasher.update(canonicalStringify(parsed) + "\n"); // Bind content
    } catch (error) {
      return {
        ok: false,
        error: `Failed to process ${file}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  const fingerprint = hasher.digest("hex");

  return { ok: true, fingerprint, files: sortedFiles };
}

/**
 * Write fingerprint to disk atomically using temp→rename strategy.
 *
 * @param contractDir - Directory containing contract files
 * @param fingerprint - The computed fingerprint hash
 */
export function writeFingerprintAtomic(contractDir: string, fingerprint: string): void {
  const outPath = path.join(contractDir, "automation-contract.hash");
  const tempHashPath = path.join(contractDir, `.hash.tmp.${crypto.randomUUID()}`);

  try {
    writeFileSync(tempHashPath, fingerprint + "\n", "utf-8");

    // On Windows, renameSync fails if target exists, so delete first
    // On POSIX, renameSync is atomic even if target exists
    if (process.platform === 'win32' && existsSync(outPath)) {
      unlinkSync(outPath);
    }

    renameSync(tempHashPath, outPath);
  } catch (error) {
    // Cleanup temp file on failure
    if (existsSync(tempHashPath)) {
      try {
        unlinkSync(tempHashPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}
