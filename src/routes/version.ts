import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../middleware/auth.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

export const versionRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/version', {
    preHandler: authenticateRequest,
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            version: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return { version: packageJson.version };
  });
};