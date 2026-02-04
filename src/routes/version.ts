import { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

export const versionRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/version', {
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