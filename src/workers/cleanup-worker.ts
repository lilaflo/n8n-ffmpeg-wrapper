import { Worker, Job } from 'bullmq';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import redisConnection from '../config/redis.js';
import { CleanupJobData } from '../types/index.js';

export const cleanupWorker = new Worker<CleanupJobData>(
  'cleanup',
  async (job: Job<CleanupJobData>) => {
    const { inputPath, outputPath } = job.data;

    console.debug(`Cleaning up files: ${inputPath}, ${outputPath}`);

    try {
      if (existsSync(inputPath)) {
        await unlink(inputPath);
        console.debug(`Deleted: ${inputPath}`);
      }

      if (existsSync(outputPath)) {
        await unlink(outputPath);
        console.debug(`Deleted: ${outputPath}`);
      }

      console.debug('Cleanup completed');
    } catch (error) {
      console.debug('Error during cleanup:', error);
      throw error;
    }
  },
  {
    connection: redisConnection
  }
);

cleanupWorker.on('completed', (job) => {
  console.debug(`Cleanup job ${job.id} completed`);
});

cleanupWorker.on('failed', (job, err) => {
  console.debug(`Cleanup job ${job?.id} failed:`, err);
});
