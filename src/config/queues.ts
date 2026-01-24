import { Queue } from 'bullmq';
import redisConnection from './redis.js';
import { ProcessJobData, CleanupJobData } from '../types/index.js';

export const videoProcessQueue = new Queue<ProcessJobData>('video-process', {
  connection: redisConnection
});

export const cleanupQueue = new Queue<CleanupJobData>('cleanup', {
  connection: redisConnection
});
