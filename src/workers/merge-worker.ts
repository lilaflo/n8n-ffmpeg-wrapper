import { Worker, Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import redisConnection from '../config/redis.js';
import { MergeJobData, JobStatus } from '../types/index.js';
import { updateJobStatus } from '../services/storage.js';

const execAsync = promisify(exec);

export const mergeWorker = new Worker<MergeJobData>(
  'merge-process',
  async (job: Job<MergeJobData>) => {
    const { uuid, videoPath, audioPath, outputPath } = job.data;

    console.debug(`Processing merge job ${uuid}`);

    try {
      await updateJobStatus(uuid, { status: JobStatus.PROCESSING });

      const ffmpegCommand = `ffmpeg -stream_loop -1 -i ${videoPath} -i ${audioPath} -shortest -map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac ${outputPath}`;
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

      console.debug(`Merge processing completed for ${uuid}`);
    } catch (error) {
      console.debug(`Error processing merge ${uuid}:`, error);

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

mergeWorker.on('completed', (job) => {
  console.debug(`Merge job ${job.id} completed`);
});

mergeWorker.on('failed', (job, err) => {
  console.debug(`Merge job ${job?.id} failed:`, err);
});