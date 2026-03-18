// src/deterministic.ts
// TEMPORARY: Copied from repo-intelligence-mcp
// Will be extracted to @mindtrace/deterministic-core in Phase B

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

/**
 * Canonical JSON stringify with deep recursive key sorting.
 * Ensures byte-identical output for same input (deterministic).
 * PARITY CRITICAL: MUST match repo-intelligence-mcp/src/core/deterministic.ts exactly.
 *
 * @param obj - Any JSON-serializable object
 * @returns Canonical JSON string (2-space indent, sorted keys at all depths)
 */
export function canonicalStringify(obj: any): string {
  return JSON.stringify(canonicalize(obj), null, 2);
}

function canonicalize(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }

  // Recursively sort keys at ALL depths
  const sorted: any = {};
  Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .forEach(key => {
      sorted[key] = canonicalize(obj[key]);
    });

  return sorted;
}

/**
 * Convert any path to POSIX format (forward slashes).
 * Strips leading ./ and normalizes // to /.
 * PARITY CRITICAL: MUST match repo-intelligence-mcp/src/core/normalization.ts exactly.
 *
 * @param path - File path (Windows or POSIX)
 * @returns POSIX normalized, repo-relative path
 */
export function toPosix(path: string): string {
  return path
    .replace(/\\/g, "/")      // backslash → forward slash
    .replace(/^\.\//, "")     // strip leading ./
    .replace(/\/+/g, "/");    // normalize multiple slashes → /
}

/**
 * Canonical list of files included in contract fingerprint
 * Must match Phase 0 identity definition exactly
 */
export const FINGERPRINT_FILES = [
  'assertion-style.json',
  'automation-contract.json',
  'framework-pattern.json',
  'page-key-policy.json',
  'repo-topology.json',
  'selector-strategy.json',
  'wrapper-discovery.json'
] as const;

/**
 * Compute deterministic fingerprint of contract files
 * Uses identical logic to repo-intelligence-mcp generation
 */
export function computeContractFingerprint(
  contractDir: string,
  mode: 'strict' | 'best_effort' = 'best_effort'
): { ok: true; fingerprint: string; files: string[] } | { ok: false; error: string } {
  const required = [...FINGERPRINT_FILES];

  const available: string[] = [];
  const missing: string[] = [];

  for (const file of required) {
    const filePath = join(contractDir, file);
    if (existsSync(filePath)) {
      available.push(file);
    } else {
      missing.push(file);
    }
  }

  if (mode === 'strict' && missing.length > 0) {
    return { ok: false, error: `Missing required files: ${missing.join(', ')}` };
  }

  if (available.length === 0) {
    return { ok: false, error: 'No contract files found' };
  }

  const sortedFiles = available.slice().sort((a, b) => a.localeCompare(b));

  // Include filename in hash stream to bind content to specific file
  const hasher = crypto.createHash('sha256');

  for (const file of sortedFiles) {
    try {
      const content = readFileSync(join(contractDir, file), 'utf-8');
      const parsed = JSON.parse(content);

      hasher.update(toPosix(file) + '\n'); // Bind filename
      hasher.update(canonicalStringify(parsed) + '\n'); // Bind content
    } catch (error) {
      return {
        ok: false,
        error: `Failed to process ${file}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  const fingerprint = hasher.digest('hex');

  return { ok: true, fingerprint, files: sortedFiles };
}
