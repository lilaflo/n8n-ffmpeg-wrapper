export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface ProcessJobData {
  uuid: string;
  inputPath: string;
  outputPath: string;
  command: string;
}

export interface CleanupJobData {
  inputPath: string;
  outputPath: string;
}

export interface StatusResponse {
  task: string;
  status: JobStatus;
  url: string | null;
  error?: string;
}
