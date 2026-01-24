import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getJobStatus } from '../services/storage.js';
import { authenticateRequest } from '../middleware/auth.js';

interface StatusParams {
  uuid: string;
}

export async function statusRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: StatusParams }>('/status/:uuid', { preHandler: authenticateRequest }, async (request, reply) => {
    const { uuid } = request.params;

    const status = await getJobStatus(uuid);

    if (!status) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    return reply.send(status);
  });
}
