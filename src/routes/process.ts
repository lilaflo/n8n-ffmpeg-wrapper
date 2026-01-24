import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { videoProcessQueue } from '../config/queues.js';
import { validateFfmpegCommand } from '../services/validation.js';
import { setJobStatus } from '../services/storage.js';
import { JobStatus } from '../types/index.js';

interface ProcessBody {
  command: string;
}

export async function processRoutes(fastify: FastifyInstance) {
  fastify.post('/process', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const command = data.fields.command?.value as string;

      if (!command) {
        return reply.code(400).send({ error: 'No command provided' });
      }

      const validation = validateFfmpegCommand(command);
      if (!validation.valid) {
        return reply.code(400).send({ error: validation.error });
      }

      const uuid = uuidv4();
      const inputPath = `/tmp/${uuid}.mpg`;
      const outputPath = `/tmp/${uuid}_output.mp4`;

      await pipeline(data.file, createWriteStream(inputPath));

      await setJobStatus(uuid, JobStatus.PENDING);

      await videoProcessQueue.add('process-video', {
        uuid,
        inputPath,
        outputPath,
        command
      });

      return reply.code(202).send({ task: uuid });
    } catch (error) {
      console.debug('Error in /process:', error);
      return reply.code(500).send({ error: 'Failed to process upload' });
    }
  });
}
