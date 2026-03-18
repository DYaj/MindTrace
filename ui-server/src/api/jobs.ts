import { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, JobStatus } from '@breakline/ui-types';
import { JobService } from '../services/job-service.js';

const jobsRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/jobs/:jobId
   * Get job status and result
   *
   * Used for polling job progress.
   */
  server.get<{
    Params: { jobId: string };
    Reply: ApiResponse<JobStatus>;
  }>('/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params;
      const job = JobService.getJob(jobId);

      if (!job) {
        return reply.code(404).send({
          success: false,
          error: `Job not found: ${jobId}`
        });
      }

      return reply.send({
        success: true,
        data: job
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read job status'
      });
    }
  });
};

export default jobsRoutes;
