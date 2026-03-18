import { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, CacheStatus } from '@breakline/ui-types';
import { CacheService } from '../services/cache-service.js';

const cacheRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/cache
   * Get cache status and page list
   *
   * READ-ONLY visibility layer
   * Does NOT implement drift detection logic
   */
  server.get<{ Reply: ApiResponse<CacheStatus> }>('/', async (request, reply) => {
    try {
      const status = CacheService.getCacheStatus();

      return reply.send({
        success: true,
        data: status
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read cache'
      });
    }
  });
};

export default cacheRoutes;
