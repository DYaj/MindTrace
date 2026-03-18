import { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, SystemStatus } from '@breakline/ui-types';
import { SystemService } from '../services/system-service.js';

const systemRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/system/status
   * Get overall system health and readiness
   *
   * This is an aggregated view, NOT a second source of truth
   */
  server.get<{ Reply: ApiResponse<SystemStatus> }>('/status', async (request, reply) => {
    try {
      const status = await SystemService.getSystemStatus();

      return reply.send({
        success: true,
        data: status
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'System status check failed'
      });
    }
  });
};

export default systemRoutes;
