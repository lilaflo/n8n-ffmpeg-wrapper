import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { setJobStatus, getJobStatus } from '../services/storage.js';
import { JobStatus } from '../types/index.js';
import redisConnection from '../config/redis.js';

describe.skipIf(!process.env.REDIS_RUNNING)('storage service', () => {
  beforeAll(async () => {
    try {
      await redisConnection.ping();
    } catch (error) {
      console.debug('Redis not available, skipping storage tests');
      throw error;
    }
  }, 30000);

  beforeEach(async () => {
    await redisConnection.flushdb();
  }, 30000);

  afterAll(async () => {
    await redisConnection.quit();
  }, 30000);

  it('should store and retrieve job status', async () => {
    const uuid = 'test-uuid-123';
    await setJobStatus(uuid, JobStatus.PENDING);

    const status = await getJobStatus(uuid);
    expect(status).toBeDefined();
    expect(status?.task).toBe(uuid);
    expect(status?.status).toBe(JobStatus.PENDING);
    expect(status?.url).toBeNull();
  });

  it('should update job status to COMPLETED with URL', async () => {
    const uuid = 'test-uuid-456';
    const downloadUrl = '/download/test-uuid-456';

    await setJobStatus(uuid, JobStatus.PENDING);
    await setJobStatus(uuid, JobStatus.COMPLETED, downloadUrl);

    const status = await getJobStatus(uuid);
    expect(status?.status).toBe(JobStatus.COMPLETED);
    expect(status?.url).toBe(downloadUrl);
  });

  it('should store error message on FAILED status', async () => {
    const uuid = 'test-uuid-789';
    const errorMsg = 'FFmpeg process failed';

    await setJobStatus(uuid, JobStatus.FAILED, null, errorMsg);

    const status = await getJobStatus(uuid);
    expect(status?.status).toBe(JobStatus.FAILED);
    expect(status?.error).toBe(errorMsg);
  });

  it('should return null for non-existent job', async () => {
    const status = await getJobStatus('non-existent-uuid');
    expect(status).toBeNull();
  });
});
