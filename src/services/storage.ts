import { JobStatus, StatusResponse } from '../types/index.js';
import redisConnection from '../config/redis.js';

const STATUS_PREFIX = 'job:status:';
const STATUS_TTL = 86400; // 24 hours

export async function setJobStatus(
  uuid: string,
  status: JobStatus,
  url: string | null = null,
  error?: string
): Promise<void> {
  const data: StatusResponse = {
    task: uuid,
    status,
    url,
    ...(error && { error })
  };

  await redisConnection.setex(
    `${STATUS_PREFIX}${uuid}`,
    STATUS_TTL,
    JSON.stringify(data)
  );
}

export async function getJobStatus(uuid: string): Promise<StatusResponse | null> {
  const data = await redisConnection.get(`${STATUS_PREFIX}${uuid}`);
  if (!data) {
    return null;
  }

  return JSON.parse(data) as StatusResponse;
}
