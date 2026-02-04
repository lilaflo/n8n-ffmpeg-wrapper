import { Queue } from 'bullmq';
import redisConnection from './redis.js';
import { ProcessJobData, CleanupJobData, MergeJobData } from '../types/index.js';

export const videoProcessQueue = new Queue<ProcessJobData>('video-process', {
  connection: redisConnection
});

export const mergeQueue = new Queue<MergeJobData>('merge-process', {
  connection: redisConnection
});

export const cleanupQueue = new Queue<CleanupJobData>('cleanup', {
  connection: redisConnection
});
