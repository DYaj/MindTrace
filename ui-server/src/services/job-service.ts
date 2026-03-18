import type { JobStatus, JobResult } from '@breakline/ui-types';
import { randomBytes } from 'crypto';

/**
 * Job orchestration service
 *
 * In-memory job registry for tracking async CLI/MCP operations.
 * Jobs represent long-running commands (run tests, generate contract, build cache).
 *
 * IMPORTANT: This tracks job STATUS only.
 * Job execution is delegated to CliService.
 * Job results are read from artifacts (runId, exitCode are authoritative).
 */
export class JobService {
  private static jobs = new Map<string, JobStatus>();

  /**
   * Create a new job
   */
  static createJob(type: 'run' | 'generate-contract' | 'build-cache'): string {
    const jobId = randomBytes(16).toString('hex');

    const job: JobStatus = {
      jobId,
      type,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.jobs.set(jobId, job);
    return jobId;
  }

  /**
   * Get job status
   */
  static getJob(jobId: string): JobStatus | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Update job status
   */
  static updateJob(jobId: string, updates: Partial<JobStatus>): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    Object.assign(job, updates);
  }

  /**
   * Mark job as running
   */
  static startJob(jobId: string): void {
    this.updateJob(jobId, {
      status: 'running',
      startedAt: new Date().toISOString()
    });
  }

  /**
   * Mark job as completed with result
   */
  static completeJob(jobId: string, result: JobResult): void {
    this.updateJob(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      result
    });
  }

  /**
   * Mark job as failed
   */
  static failJob(jobId: string, error: string): void {
    this.updateJob(jobId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      result: { error }
    });
  }

  /**
   * Get all jobs (for debugging)
   */
  static getAllJobs(): JobStatus[] {
    return Array.from(this.jobs.values());
  }
}
