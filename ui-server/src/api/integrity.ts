import { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, IntegrityStatus } from '@breakline/ui-types';
import { IntegrityService } from '../services/integrity-service.js';

const integrityRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/integrity
   * Get integrity gate status
   *
   * AUTHORITATIVE: Delegates to @mindtrace/integrity-gates
   * Returns real gate verification results
   */
  server.get<{ Reply: ApiResponse<IntegrityStatus> }>('/', async (request, reply) => {
    try {
      const status = await IntegrityService.getIntegrityStatus();

      return reply.send({
        success: true,
        data: status
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read integrity status'
      });
    }
  });
};

export default integrityRoutes;
