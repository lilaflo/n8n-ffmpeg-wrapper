import { JobStatus, StatusResponse } from '../types/index.js';
import redisConnection from '../config/redis.js';

const STATUS_PREFIX = 'job:status:';
const STATUS_TTL = 86400; // 24 hours

export async function setJobStatus(
  uuid: string,
  status: JobStatus,
  url: string | null = null,
  error?: string,
  cmd?: string
): Promise<void> {
  const data: StatusResponse = {
    task: uuid,
    status,
    url,
    ...(cmd && { cmd }),
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

export async function updateJobStatus(
  uuid: string,
  updates: Partial<Omit<StatusResponse, 'task'>>
): Promise<void> {
  const existing = await getJobStatus(uuid);

  const data: StatusResponse = {
    task: uuid,
    status: updates.status ?? existing?.status ?? JobStatus.PENDING,
    url: updates.url !== undefined ? updates.url : (existing?.url ?? null),
    ...(updates.cmd && { cmd: updates.cmd }),
    ...(existing?.cmd && !updates.cmd && { cmd: existing.cmd }),
    ...(updates.error && { error: updates.error })
  };

  await redisConnection.setex(
    `${STATUS_PREFIX}${uuid}`,
    STATUS_TTL,
    JSON.stringify(data)
  );
}
