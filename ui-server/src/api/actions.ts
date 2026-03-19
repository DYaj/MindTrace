import { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, JobResponse, RunTestsRequest } from '@breakline/ui-types';
import { JobService } from '../services/job-service.js';
import { CliService } from '../services/cli-service.js';
import { RepoIntelligenceService } from '../services/repo-intelligence-service.js';
import { rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getRepoRoot } from '../utils/repo-root.js';

const actionsRoutes: FastifyPluginAsync = async (server) => {
  /**
   * POST /api/actions/run
   * Start a test run via runtime CLI
   *
   * Creates a job and spawns CLI in background.
   * Returns jobId for polling.
   */
  server.post<{
    Body: RunTestsRequest;
    Reply: ApiResponse<JobResponse>;
  }>('/run', async (request, reply) => {
    try {
      // Create job
      const jobId = JobService.createJob('run');

      // Spawn CLI in background (non-blocking)
      CliService.runTests(jobId).catch((error) => {
        server.log.error(`Job ${jobId} failed:`, error);
      });

      return reply.send({
        success: true,
        data: {
          jobId,
          status: 'pending'
        }
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start test run'
      });
    }
  });

  /**
   * POST /api/actions/generate-contract
   * Generate contract bundle via repo-intelligence-mcp
   *
   * Creates a job and runs contract generation in background.
   * Returns jobId for polling.
   */
  server.post<{
    Reply: ApiResponse<JobResponse>;
  }>('/generate-contract', async (request, reply) => {
    try {
      // Create job
      const jobId = JobService.createJob('generate-contract');

      // Spawn contract generation in background (non-blocking)
      RepoIntelligenceService.generateContract(jobId).catch((error) => {
        server.log.error(`Job ${jobId} failed:`, error);
      });

      return reply.send({
        success: true,
        data: {
          jobId,
          status: 'pending'
        }
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start contract generation'
      });
    }
  });

  /**
   * POST /api/actions/build-cache
   * Build page cache from existing contract
   *
   * Creates a job and runs cache build in background.
   * Returns jobId for polling.
   *
   * CRITICAL: Contract must exist first. This action will fail if contract is missing.
   */
  server.post<{
    Reply: ApiResponse<JobResponse>;
  }>('/build-cache', async (request, reply) => {
    try {
      // Create job
      const jobId = JobService.createJob('build-cache');

      // Spawn cache build in background (non-blocking)
      RepoIntelligenceService.buildCache(jobId).catch((error) => {
        server.log.error(`Job ${jobId} failed:`, error);
      });

      return reply.send({
        success: true,
        data: {
          jobId,
          status: 'pending'
        }
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start cache build'
      });
    }
  });

  /**
   * POST /api/actions/clear-all
   * TESTING ONLY: Clear all data (contract, cache, runs, history)
   *
   * WARNING: Destructive action. Clears everything.
   */
  server.post<{
    Reply: ApiResponse<{ cleared: boolean }>;
  }>('/clear-all', async (request, reply) => {
    try {
      const repoRoot = getRepoRoot();

      // Clear contract
      const contractPath = join(repoRoot, '.mcp-contract');
      if (existsSync(contractPath)) {
        rmSync(contractPath, { recursive: true, force: true });
      }

      // Clear cache
      const cachePath = join(repoRoot, '.mcp-cache');
      if (existsSync(cachePath)) {
        rmSync(cachePath, { recursive: true, force: true });
      }

      // Clear runs
      const runsPath = join(repoRoot, 'runs');
      if (existsSync(runsPath)) {
        rmSync(runsPath, { recursive: true, force: true });
      }

      // Clear history
      const historyPath = join(repoRoot, 'history', 'run-index.jsonl');
      if (existsSync(historyPath)) {
        writeFileSync(historyPath, '', 'utf-8');
      }

      server.log.info('Testing: All data cleared (contract, cache, runs, history)');

      return reply.send({
        success: true,
        data: { cleared: true }
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear data'
      });
    }
  });
};

export default actionsRoutes;
