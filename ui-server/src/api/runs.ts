import { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, RunListItem, RunDetail } from '@breakline/ui-types';
import { RunsService } from '../services/runs-service.js';

const runsRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/runs
   * List all runs from history index
   */
  server.get<{ Reply: ApiResponse<RunListItem[]> }>('/', async (request, reply) => {
    try {
      const runs = RunsService.getRunList();

      return reply.send({
        success: true,
        data: runs
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read runs'
      });
    }
  });

  /**
   * GET /api/runs/:runId
   * Get detailed run information including artifacts and audit events
   */
  server.get<{
    Params: { runId: string };
    Reply: ApiResponse<RunDetail>;
  }>('/:runId', async (request, reply) => {
    try {
      const { runId } = request.params;
      const runDetail = RunsService.getRunDetail(runId);

      if (!runDetail) {
        return reply.code(404).send({
          success: false,
          error: `Run not found: ${runId}`
        });
      }

      return reply.send({
        success: true,
        data: runDetail
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read run details'
      });
    }
  });

  /**
   * GET /api/runs/:runId/artifacts/*
   * Get artifact file content
   */
  server.get<{
    Params: { runId: string; '*': string };
    Reply: ApiResponse<{ content: string }>;
  }>('/:runId/artifacts/*', async (request, reply) => {
    try {
      const { runId } = request.params;
      const artifactPath = request.params['*'];

      const content = RunsService.getArtifactContent(runId, artifactPath);

      if (!content) {
        return reply.code(404).send({
          success: false,
          error: `Artifact not found: ${artifactPath}`
        });
      }

      return reply.send({
        success: true,
        data: { content }
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read artifact'
      });
    }
  });
};

export default runsRoutes;
