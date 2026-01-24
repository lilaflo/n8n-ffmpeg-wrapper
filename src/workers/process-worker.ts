import { Worker, Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import redisConnection from '../config/redis.js';
import { ProcessJobData, JobStatus } from '../types/index.js';
import { updateJobStatus } from '../services/storage.js';

const execAsync = promisify(exec);

export const processWorker = new Worker<ProcessJobData>(
  'video-process',
  async (job: Job<ProcessJobData>) => {
    const { uuid, inputPath, outputPath, command } = job.data;

    console.debug(`Processing video job ${uuid}`);

    try {
      await updateJobStatus(uuid, { status: JobStatus.PROCESSING });

      const ffmpegCommand = `ffmpeg -i ${inputPath} ${command} ${outputPath}`;
      console.debug(`Executing: ${ffmpegCommand}`);

      const { stdout, stderr } = await execAsync(ffmpegCommand, {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      if (stderr) {
        console.debug(`FFmpeg stderr: ${stderr}`);
      }

      const downloadUrl = `/download/${uuid}`;
      await updateJobStatus(uuid, { status: JobStatus.COMPLETED, url: downloadUrl });

      console.debug(`Video processing completed for ${uuid}`);
    } catch (error) {
      console.debug(`Error processing video ${uuid}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateJobStatus(uuid, { status: JobStatus.FAILED, url: null, error: errorMessage });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2
  }
);

processWorker.on('completed', (job) => {
  console.debug(`Job ${job.id} completed`);
});

processWorker.on('failed', (job, err) => {
  console.debug(`Job ${job?.id} failed:`, err);
});
