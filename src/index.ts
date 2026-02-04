import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { processRoutes } from './routes/process.js';
import { mergeRoutes } from './routes/merge.js';
import { statusRoutes } from './routes/status.js';
import { downloadRoutes } from './routes/download.js';
import './workers/process-worker.js';
import './workers/merge-worker.js';
import './workers/cleanup-worker.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

fastify.register(multipart, {
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max file size
  },
  attachFieldsToBody: false
});

await fastify.register(processRoutes);
await fastify.register(mergeRoutes);
await fastify.register(statusRoutes);
await fastify.register(downloadRoutes);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.debug(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
