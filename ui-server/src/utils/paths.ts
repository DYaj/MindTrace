import { resolve, normalize, relative, sep } from 'path';
import { existsSync } from 'fs';
import { getRepoRoot } from './repo-root.js';

const REPO_ROOT = getRepoRoot();

/**
 * Path validation for UI server
 *
 * SAFETY RULES:
 * 1. All paths must stay within repo root
 * 2. No parent directory traversal (..)
 * 3. Artifact paths must be under approved roots
 */
export class PathValidator {
  /**
   * Validate repo-relative path and return absolute path
   * Throws if path escapes repo boundary
   */
  static validateRepoPath(relativePath: string): string {
    const normalized = normalize(relativePath);
    const absolute = resolve(REPO_ROOT, normalized);

    // Verify path stays within repo
    const rel = relative(REPO_ROOT, absolute);
    if (rel.startsWith('..') || rel.startsWith(sep)) {
      throw new Error('Path traversal denied');
    }

    return absolute;
  }

  /**
   * Validate runId format (alphanumeric, hyphens, underscores only)
   */
  static validateRunId(runId: string): void {
    if (!/^[a-zA-Z0-9\-_]+$/.test(runId)) {
      throw new Error('Invalid runId format');
    }
  }

  /**
   * Get run directory path (validated)
   */
  static getRunPath(runId: string): string {
    this.validateRunId(runId);
    return this.validateRepoPath(`runs/${runId}`);
  }

  /**
   * Get artifact path (supports nested paths like runtime/healing-*.jsonl)
   *
   * artifactPath can be:
   * - "playwright-report.json"
   * - "runtime/healing-attempts.jsonl"
   * - "runtime/healing-outcome.json"
   */
  static getArtifactPath(runId: string, artifactPath: string): string {
    // Validate runId
    this.validateRunId(runId);

    // Validate artifact path format (no traversal, must be under artifacts/)
    const normalized = normalize(artifactPath);
    if (normalized.includes('..')) {
      throw new Error('Artifact path traversal denied');
    }

    // Build full path
    const fullPath = this.validateRepoPath(`runs/${runId}/artifacts/${normalized}`);

    // Verify it's still under the run's artifacts directory
    const artifactsDir = this.validateRepoPath(`runs/${runId}/artifacts`);
    const rel = relative(artifactsDir, fullPath);
    if (rel.startsWith('..')) {
      throw new Error('Artifact path must be under artifacts directory');
    }

    return fullPath;
  }

  /**
   * Get contract directory path
   */
  static getContractPath(): string {
    return this.validateRepoPath('.mcp-contract');
  }

  /**
   * Get cache directory path
   */
  static getCachePath(): string {
    return this.validateRepoPath('.mcp-cache/v1');
  }

  /**
   * Check if path exists
   */
  static exists(path: string): boolean {
    return existsSync(path);
  }
}
