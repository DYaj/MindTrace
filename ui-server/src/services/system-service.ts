import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { SystemStatus } from '@breakline/ui-types';
import { PathValidator } from '../utils/paths.js';
import { getRepoRoot } from '../utils/repo-root.js';

/**
 * System health service
 *
 * CRITICAL: This is an aggregated view derived from checking
 * component availability. It does NOT reimplement integrity logic.
 *
 * IMPORTANT: SystemStatus = aggregation only.
 * Do NOT implement contract/cache/drift logic here.
 * Always delegate to integrity services in future stages.
 * This rule is FROZEN for all future implementations.
 */
export class SystemService {
  private static getRepoRoot(): string {
    return getRepoRoot();
  }

  /**
   * Get overall system status
   *
   * Checks:
   * - Runtime CLI availability
   * - Contract presence
   * - Cache presence
   * - MCP executable presence
   *
   * CORRECTED: Drift field removed - use /api/integrity endpoint for authoritative drift detection
   */
  static async getSystemStatus(): Promise<SystemStatus> {
    const repoRoot = this.getRepoRoot();

    // Check runtime
    const runtimePath = join(repoRoot, 'mindtrace-ai-runtime/dist/cli.js');
    const runtime = {
      state: existsSync(runtimePath) ? 'available' as const : 'missing' as const,
      detail: existsSync(runtimePath) ? runtimePath : undefined
    };

    // Check contract
    const contractPath = PathValidator.getContractPath();
    const contractExists = PathValidator.exists(contractPath);
    let contractFingerprint: string | undefined;
    let hasContractFiles = false;

    if (contractExists) {
      // Check for actual contract files (not just empty directory)
      const hashPath = join(contractPath, 'automation-contract.hash');
      const fingerprintPath = join(contractPath, 'contract.fingerprint.sha256');
      const jsonPath = join(contractPath, 'automation-contract.json');

      hasContractFiles = existsSync(hashPath) || existsSync(fingerprintPath) || existsSync(jsonPath);

      if (existsSync(hashPath)) {
        contractFingerprint = readFileSync(hashPath, 'utf-8').trim();
      } else if (existsSync(fingerprintPath)) {
        contractFingerprint = readFileSync(fingerprintPath, 'utf-8').trim();
      }
    }

    const contract = {
      state: (contractExists && hasContractFiles) ? 'available' as const : 'missing' as const,
      detail: contractFingerprint
    };

    // Check cache
    const cachePath = PathValidator.getCachePath();
    const cacheExists = PathValidator.exists(cachePath);
    let pageCount: number | undefined;
    let hasCacheFiles = false;

    if (cacheExists) {
      const metaPath = join(cachePath, 'meta.json');
      hasCacheFiles = existsSync(metaPath);

      if (hasCacheFiles) {
        try {
          const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
          // Support both formats: pages_count (current) and pages.length (legacy)
          pageCount = meta.pages_count ?? meta.pages?.length ?? 0;
        } catch {
          // If meta.json is malformed, treat as missing
          hasCacheFiles = false;
        }
      }
    }

    const cache = {
      state: (cacheExists && hasCacheFiles) ? 'available' as const : 'missing' as const,
      detail: pageCount !== undefined ? `${pageCount} pages` : undefined
    };

    // Check MCP
    const mcpPath = join(repoRoot, 'repo-intelligence-mcp/dist/mcp/cli.js');
    const mcp = {
      state: existsSync(mcpPath) ? 'available' as const : 'missing' as const,
      detail: existsSync(mcpPath) ? 'Installed on disk' : undefined
    };

    return {
      runtime,
      contract,
      cache,
      mcp
    };
  }
}
