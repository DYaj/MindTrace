import { spawn } from 'child_process';
import { join } from 'path';
import type { JobResult } from '@breakline/ui-types';
import { JobService } from './job-service.js';
import { getRepoRoot } from '../utils/repo-root.js';

/**
 * CLI execution service
 *
 * Spawns mindtrace-ai-runtime CLI commands as background jobs.
 *
 * IMPORTANT: This executes CLI commands only.
 * Result interpretation is based on:
 * - exitCode (authoritative)
 * - runId from artifacts (authoritative)
 * - stdout/stderr (supplemental diagnostics only)
 */
export class CliService {
  private static getRepoRoot(): string {
    return getRepoRoot();
  }

  private static getRuntimeCli(): string {
    return join(this.getRepoRoot(), 'mindtrace-ai-runtime/dist/cli.js');
  }

  /**
   * Run tests via runtime CLI
   *
   * Spawns: node mindtrace-ai-runtime/dist/cli.js run
   *
   * DEFENSIVE: Captures stdout/stderr but treats them as supplemental.
   * Authoritative result comes from exit code + artifacts.
   */
  static async runTests(jobId: string): Promise<void> {
    return new Promise((resolve) => {
      // Mark job as running
      JobService.startJob(jobId);

      const repoRoot = this.getRepoRoot();
      const runtimeCli = this.getRuntimeCli();

      let stdout = '';
      let stderr = '';

      // Spawn CLI process
      const child = spawn('node', [runtimeCli, 'run'], {
        cwd: repoRoot,
        env: process.env
      });

      // Capture stdout (supplemental)
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Capture stderr (supplemental)
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      child.on('close', (exitCode) => {
        const result: JobResult = {
          exitCode: exitCode ?? undefined,
          stdout: stdout.trim() || undefined,
          stderr: stderr.trim() || undefined
        };

        // Try to extract runId from stdout (if CLI prints it)
        const runIdMatch = stdout.match(/runId[:\s]+([a-zA-Z0-9\-_]+)/i);
        if (runIdMatch) {
          result.runId = runIdMatch[1];
        }

        if (exitCode === 0) {
          JobService.completeJob(jobId, result);
        } else {
          result.error = `CLI exited with code ${exitCode}`;
          JobService.failJob(jobId, result.error);
        }

        resolve();
      });

      // Handle spawn errors
      child.on('error', (error) => {
        const errorMessage = `Failed to spawn CLI: ${error.message}`;
        const result: JobResult = {
          error: errorMessage,
          stderr: error.message
        };
        JobService.failJob(jobId, errorMessage);
        resolve();
      });
    });
  }
}
