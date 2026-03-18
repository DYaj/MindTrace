import { join } from 'path';
import { readFile } from 'fs/promises';
import type { JobResult } from '@breakline/ui-types';
import { JobService } from './job-service.js';
import { getRepoRoot } from '../utils/repo-root.js';

// Direct imports from @mindtrace/repo-intelligence-mcp
import { generateContractBundle } from '@mindtrace/repo-intelligence-mcp/dist/tools/generateContractBundle.js';
import { buildPageCache } from '@mindtrace/repo-intelligence-mcp/dist/tools/buildPageCache.js';

/**
 * Repo Intelligence / Producer service
 *
 * CRITICAL: This handles producer operations (contract generation, cache building).
 * Do NOT add runtime execution here - use CliService for that.
 *
 * BOUNDARY: Uses direct imports from @mindtrace/repo-intelligence-mcp (not MCP protocol).
 * This is correct for Stage 3C as an internal backend integration.
 *
 * Cache build is contract-derived: loads existing contract files and builds cache from them.
 */
export class RepoIntelligenceService {
  private static getRepoRoot(): string {
    return getRepoRoot();
  }

  /**
   * Generate contract bundle
   *
   * Spawns contract generation as async job.
   * Uses: generateContractBundle({ repoRoot, mode: 'best_effort' })
   */
  static async generateContract(jobId: string): Promise<void> {
    JobService.startJob(jobId);

    const repoRoot = this.getRepoRoot();

    try {
      // Call producer function directly (stable API)
      const result = await generateContractBundle({
        repoRoot,
        mode: 'best_effort'
      });

      if (result.ok) {
        const jobResult: JobResult = {
          exitCode: 0,
          stdout: `Contract generated successfully. Hash: ${result.contractSha256}\nFiles: ${result.filesWritten.join(', ')}`
        };
        JobService.completeJob(jobId, jobResult);
      } else {
        const errorMessage = `Contract generation failed: ${result.error}`;
        JobService.failJob(jobId, errorMessage);
      }
    } catch (error) {
      const errorMessage = `Failed to generate contract: ${error instanceof Error ? error.message : String(error)}`;
      JobService.failJob(jobId, errorMessage);
    }
  }

  /**
   * Build page cache (contract-derived)
   *
   * Spawns cache build as async job.
   * Loads existing contract from disk, then builds cache from contract.
   *
   * CRITICAL: Contract must exist first. This action will fail if contract is missing.
   */
  static async buildCache(jobId: string): Promise<void> {
    JobService.startJob(jobId);

    const repoRoot = this.getRepoRoot();

    try {
      // Step 1: Determine contract directory location
      const canonicalContractDir = join(repoRoot, '.mcp-contract');
      const legacyContractDir = join(repoRoot, '.mindtrace', 'contracts');

      // Try canonical first, fall back to legacy
      let contractDir = canonicalContractDir;
      try {
        await readFile(join(canonicalContractDir, 'automation-contract.json'), 'utf-8');
      } catch {
        contractDir = legacyContractDir;
      }

      // Step 2: Load required contract files
      const contractPath = join(contractDir, 'automation-contract.json');
      const policyPath = join(contractDir, 'page-key-policy.json');
      const fingerprintPath = join(contractDir, 'contract.fingerprint.sha256');

      let automationContract: any;
      let pageKeyPolicy: any;
      let contractSha256: string;

      try {
        const [contractJson, policyJson, fingerprintContent] = await Promise.all([
          readFile(contractPath, 'utf-8'),
          readFile(policyPath, 'utf-8'),
          readFile(fingerprintPath, 'utf-8')
        ]);

        automationContract = JSON.parse(contractJson);
        pageKeyPolicy = JSON.parse(policyJson);
        contractSha256 = fingerprintContent.trim();
      } catch (readError) {
        const errorMessage = `Contract files missing or invalid. Generate contract first. Error: ${readError instanceof Error ? readError.message : String(readError)}`;
        JobService.failJob(jobId, errorMessage);
        return;
      }

      // Step 3: Build cache from contract (contract-derived)
      const cacheDir = join(repoRoot, '.mcp-cache');

      const result = await buildPageCache({
        automationContract,
        pageKeyPolicy,
        contractSha256,
        outputDir: cacheDir
      });

      if (result.ok) {
        const jobResult: JobResult = {
          exitCode: 0,
          stdout: `Page cache built successfully. Pages written: ${result.pagesWritten}`
        };
        JobService.completeJob(jobId, jobResult);
      } else {
        const errorMessage = `Cache build failed: ${result.error}`;
        JobService.failJob(jobId, errorMessage);
      }
    } catch (error) {
      const errorMessage = `Failed to build cache: ${error instanceof Error ? error.message : String(error)}`;
      JobService.failJob(jobId, errorMessage);
    }
  }
}
