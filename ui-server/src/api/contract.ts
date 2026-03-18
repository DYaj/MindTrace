import { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, ContractStatus } from '@breakline/ui-types';
import { ContractService } from '../services/contract-service.js';

const contractRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/contract
   * Get contract status and files
   *
   * READ-ONLY visibility layer
   * Does NOT implement validation logic
   */
  server.get<{ Reply: ApiResponse<ContractStatus> }>('/', async (request, reply) => {
    try {
      const status = ContractService.getContractStatus();

      return reply.send({
        success: true,
        data: status
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read contract'
      });
    }
  });
};

export default contractRoutes;
