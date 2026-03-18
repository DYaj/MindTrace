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

    if (contractExists) {
      const hashPath = join(contractPath, 'automation-contract.hash');
      if (existsSync(hashPath)) {
        contractFingerprint = readFileSync(hashPath, 'utf-8').trim();
      }
    }

    const contract = {
      state: contractExists ? 'available' as const : 'missing' as const,
      detail: contractFingerprint
    };

    // Check cache
    const cachePath = PathValidator.getCachePath();
    const cacheExists = PathValidator.exists(cachePath);
    let pageCount: number | undefined;

    if (cacheExists) {
      const metaPath = join(cachePath, 'meta.json');
      if (existsSync(metaPath)) {
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        pageCount = meta.pages?.length ?? 0;
      }
    }

    const cache = {
      state: cacheExists ? 'available' as const : 'missing' as const,
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
