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

  /**
   * GET /api/cache/pages/:pageKey
   * Get cache page file content
   */
  server.get<{
    Params: { pageKey: string };
    Reply: ApiResponse<{ content: string }>;
  }>('/pages/:pageKey', async (request, reply) => {
    try {
      const { pageKey } = request.params;
      const content = CacheService.getCachePageContent(pageKey);

      if (!content) {
        return reply.code(404).send({
          success: false,
          error: `Cache page not found: ${pageKey}`
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
        error: error instanceof Error ? error.message : 'Failed to read cache page'
      });
    }
  });
};

export default cacheRoutes;
