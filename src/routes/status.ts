import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getJobStatus } from '../services/storage.js';

interface StatusParams {
  uuid: string;
}

export async function statusRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: StatusParams }>('/status/:uuid', async (request, reply) => {
    const { uuid } = request.params;

    const status = await getJobStatus(uuid);

    if (!status) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    return reply.send(status);
  });
}
