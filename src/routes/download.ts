import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getJobStatus } from '../services/storage.js';
import { cleanupQueue } from '../config/queues.js';
import { JobStatus } from '../types/index.js';
import { existsSync, createReadStream } from 'fs';
import { authenticateRequest } from '../middleware/auth.js';

interface DownloadParams {
  uuid: string;
}

export async function downloadRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: DownloadParams }>('/download/:uuid', { preHandler: authenticateRequest }, async (request, reply) => {
    const { uuid } = request.params;

    const status = await getJobStatus(uuid);

    if (!status) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    if (status.status !== JobStatus.COMPLETED) {
      return reply.code(400).send({ error: 'Video processing not completed', status: status.status });
    }

    const outputPath = `/tmp/${uuid}_output.mp4`;
    const inputPath = `/tmp/${uuid}.mpg`;

    if (!existsSync(outputPath)) {
      return reply.code(404).send({ error: 'Processed video file not found' });
    }

    await cleanupQueue.add(
      'cleanup-files',
      { inputPath, outputPath },
      { delay: 3600000 } // 1 hour delay
    );

    reply.header('Content-Type', 'video/mp4');
    reply.header('Content-Disposition', `attachment; filename="${uuid}_output.mp4"`);
    return reply.send(createReadStream(outputPath));
  });
}
