import Fastify from 'fastify';
import cors from '@fastify/cors';

// Routes
import runsRoutes from './api/runs.js';
import systemRoutes from './api/system.js';
import contractRoutes from './api/contract.js';
import cacheRoutes from './api/cache.js';
import integrityRoutes from './api/integrity.js';
import actionsRoutes from './api/actions.js';
import jobsRoutes from './api/jobs.js';

const server = Fastify({
  logger: {
    level: 'info'
  }
});

// CORS for local development
await server.register(cors, {
  origin: 'http://localhost:3000' // ui-client dev server
});

// API routes
server.register(runsRoutes, { prefix: '/api/runs' });
server.register(systemRoutes, { prefix: '/api/system' });
server.register(contractRoutes, { prefix: '/api/contract' });
server.register(cacheRoutes, { prefix: '/api/cache' });
server.register(integrityRoutes, { prefix: '/api/integrity' });
server.register(actionsRoutes, { prefix: '/api/actions' });
server.register(jobsRoutes, { prefix: '/api/jobs' });

// Health check
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

try {
  await server.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`✅ BreakLine UI Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Runs API: http://localhost:${PORT}/api/runs`);
  console.log(`⚙️  System API: http://localhost:${PORT}/api/system/status`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
