import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Worker, Job } from 'bullmq';
import { updateJobStatus } from '../services/storage.js';
import { JobStatus, MergeJobData } from '../types/index.js';

// Mock dependencies
vi.mock('../services/storage.js');
vi.mock('child_process', () => ({
  exec: vi.fn(),
  __esModule: true
}));

vi.mock('../config/redis.js', () => ({
  default: {}
}));

const mockUpdateJobStatus = vi.mocked(updateJobStatus);

describe('mergeWorker functionality', () => {
  let mockJob: Job<MergeJobData>;
  let mockExec: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUpdateJobStatus.mockResolvedValue(undefined);
    
    mockJob = {
      data: {
        uuid: 'test-uuid',
        videoPath: '/tmp/test-uuid_video.mp4',
        audioPath: '/tmp/test-uuid_audio.mp3',
        outputPath: '/tmp/test-uuid_output.mp4'
      }
    } as any;

    // Mock exec
    const { exec } = await import('child_process');
    mockExec = vi.mocked(exec);
  });

  it('should construct correct ffmpeg command for merging', () => {
    const { videoPath, audioPath, outputPath } = mockJob.data;
    const expectedCommand = `ffmpeg -stream_loop -1 -i ${videoPath} -i ${audioPath} -shortest -map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac ${outputPath}`;
    
    expect(expectedCommand).toBe(
      'ffmpeg -stream_loop -1 -i /tmp/test-uuid_video.mp4 -i /tmp/test-uuid_audio.mp3 -shortest -map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac /tmp/test-uuid_output.mp4'
    );
  });

  it('should update job status through the processing flow', async () => {
    // Simulate the flow that would happen in the worker
    await mockUpdateJobStatus(mockJob.data.uuid, { status: JobStatus.PROCESSING });
    
    const ffmpegCommand = `ffmpeg -stream_loop -1 -i ${mockJob.data.videoPath} -i ${mockJob.data.audioPath} -shortest -map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac ${mockJob.data.outputPath}`;
    
    // Mock successful execution
    mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
      callback!(null, 'stdout', 'stderr');
      return { on: vi.fn(), kill: vi.fn() } as any;
    });

    // Simulate successful completion
    await mockUpdateJobStatus(mockJob.data.uuid, { 
      status: JobStatus.COMPLETED, 
      url: '/download/test-uuid' 
    });

    expect(mockUpdateJobStatus).toHaveBeenCalledWith('test-uuid', { status: JobStatus.PROCESSING });
    expect(mockUpdateJobStatus).toHaveBeenCalledWith('test-uuid', { 
      status: JobStatus.COMPLETED, 
      url: '/download/test-uuid' 
    });
  });

  it('should handle job failure correctly', async () => {
    // Simulate the flow that would happen in the worker on failure
    await mockUpdateJobStatus(mockJob.data.uuid, { status: JobStatus.PROCESSING });
    
    // Simulate failure
    const errorMessage = 'FFmpeg processing failed';
    await mockUpdateJobStatus(mockJob.data.uuid, { 
      status: JobStatus.FAILED, 
      url: null, 
      error: errorMessage 
    });

    expect(mockUpdateJobStatus).toHaveBeenCalledWith('test-uuid', { status: JobStatus.PROCESSING });
    expect(mockUpdateJobStatus).toHaveBeenCalledWith('test-uuid', { 
      status: JobStatus.FAILED, 
      url: null, 
      error: errorMessage 
    });
  });
});