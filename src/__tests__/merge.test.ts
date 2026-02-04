import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergeRoutes } from '../routes/merge.js';
import { mergeQueue } from '../config/queues.js';
import { setJobStatus } from '../services/storage.js';
import { JobStatus } from '../types/index.js';

// Mock dependencies
vi.mock('../config/queues.js');
vi.mock('../services/storage.js');
vi.mock('../middleware/auth.js', () => ({
  authenticateRequest: vi.fn((req, reply, done) => done())
}));

describe('mergeRoutes', () => {
  const mockQueueAdd = vi.mocked(mergeQueue.add);
  const mockSetJobStatus = vi.mocked(setJobStatus);

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueAdd.mockResolvedValue({} as any);
    mockSetJobStatus.mockResolvedValue(undefined);
  });

  it('should successfully process valid audio and video files', async () => {
    const mockFastify = {
      post: vi.fn((route, options, handler) => {
        // Store the handler for testing
        (mockFastify as any)._mergeHandler = handler;
      })
    } as any;

    const mockRequest = {
      parts: vi.fn().mockImplementation(async function* () {
        yield {
          type: 'file',
          fieldname: 'video',
          filename: 'test.mp4',
          file: {
            [Symbol.asyncIterator]: async function* () {
              yield Buffer.from('video content');
            }
          }
        };
        yield {
          type: 'file',
          fieldname: 'audio',
          filename: 'test.mp3',
          file: {
            [Symbol.asyncIterator]: async function* () {
              yield Buffer.from('audio content');
            }
          }
        };
      })
    } as any;

    const mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn()
    } as any;

    await mergeRoutes(mockFastify);
    const handler = (mockFastify as any)._mergeHandler;
    if (handler) {
      await handler(mockRequest, mockReply);
    }

    expect(mockSetJobStatus).toHaveBeenCalledWith(
      expect.any(String),
      JobStatus.PENDING,
      null,
      undefined,
      expect.stringContaining('ffmpeg -stream_loop -1')
    );
    expect(mockQueueAdd).toHaveBeenCalledWith('merge-video-audio', {
      uuid: expect.any(String),
      videoPath: expect.stringMatching(/\/tmp\/.*_video\.mp4/),
      audioPath: expect.stringMatching(/\/tmp\/.*_audio\.mp3/),
      outputPath: expect.stringMatching(/\/tmp\/.*_output\.mp4/)
    });
    expect(mockReply.code).toHaveBeenCalledWith(202);
    expect(mockReply.send).toHaveBeenCalledWith({ task: expect.any(String) });
  });

  it('should reject request with missing video file', async () => {
    const mockFastify = {
      post: vi.fn((route, options, handler) => {
        (mockFastify as any)._mergeHandler = handler;
      })
    } as any;

    const mockRequest = {
      parts: vi.fn().mockImplementation(async function* () {
        yield {
          type: 'file',
          fieldname: 'audio',
          filename: 'test.mp3',
          file: {
            [Symbol.asyncIterator]: async function* () {
              yield Buffer.from('audio content');
            }
          }
        };
      })
    } as any;

    const mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn()
    } as any;

    await mergeRoutes(mockFastify);
    const handler = (mockFastify as any)._mergeHandler;
    if (handler) {
      await handler(mockRequest, mockReply);
    }

    expect(mockReply.code).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith({ error: "No video file uploaded" });
  });

  it('should reject request with missing audio file', async () => {
    const mockFastify = {
      post: vi.fn((route, options, handler) => {
        (mockFastify as any)._mergeHandler = handler;
      })
    } as any;

    const mockRequest = {
      parts: vi.fn().mockImplementation(async function* () {
        yield {
          type: 'file',
          fieldname: 'video',
          filename: 'test.mp4',
          file: {
            [Symbol.asyncIterator]: async function* () {
              yield Buffer.from('video content');
            }
          }
        };
      })
    } as any;

    const mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn()
    } as any;

    await mergeRoutes(mockFastify);
    const handler = (mockFastify as any)._mergeHandler;
    if (handler) {
      await handler(mockRequest, mockReply);
    }

    expect(mockReply.code).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith({ error: "No audio file uploaded" });
  });

  it('should handle processing errors gracefully', async () => {
    const mockFastify = {
      post: vi.fn((route, options, handler) => {
        (mockFastify as any)._mergeHandler = handler;
      })
    } as any;

    const mockRequest = {
      parts: vi.fn().mockRejectedValue(new Error('Processing error'))
    } as any;

    const mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn()
    } as any;

    await mergeRoutes(mockFastify);
    const handler = (mockFastify as any)._mergeHandler;
    if (handler) {
      await handler(mockRequest, mockReply);
    }

    expect(mockReply.code).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalledWith({ error: "Failed to process merge upload" });
  });
});