# Video Modifier

This is an internal API endpoint for N8N which accepts a Video (binary) and a command to be executed on the binary, containing ffmpeg instructions like `-filter:v "setpts=3.0*PTS"`.
Internally, this stores the video at /tmp/video.mpg, then applies the command (for this example: `ffmpeg -i /tmp/input.mp4 -filter:v "setpts=3.0*PTS" -an /tmp/output.mp4`).


## Workflow

1. For every process, a uuid is generated
2. The video is stored as /tmp/<UUID>.mpg - so multiple videos can be uploaded at the same time
3. The uuidv4 is returned as response to the initial POST command
3. A BullMQ job is triggered, which applies the command to the stored video
4. An additional endpoint can be called via GET to check the status of the process
5. While it's processed, the return is a JSON `{ "task": "<UUID>", "status": "PENDING", "url": null }`
6. Once the command is finished, the GET endpoint returns `{ "task": "<UUID>", "status": "COMPLETED", "url": "<DOWNLOAD-URL>" }`
7. Now another GET call can download the file
8. Once the Download endpoint has been called, another BullMQ job is triggered, deleting the processed video and initial uploaded video with a 1h delay

## Technology

- pnpm
- TypeScript
- Redis (for BullMQ and job status storage)
- BullMQ
- Docker
- Fastify
- FFmpeg

## Installation

```bash
pnpm install
```

## Development

```bash
# Start Redis (required)
docker run -d -p 6379:6379 redis:7-alpine

# Run in development mode
pnpm dev

# Run tests (unit tests only, no Redis required)
pnpm test

# Run all tests including integration tests (requires Redis)
pnpm test:integration
```

## Production

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or build and run manually
pnpm build
pnpm start
```

## API Endpoints

### POST /process
Upload a video file and ffmpeg command for processing.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `file`: Video file (binary)
  - `command`: FFmpeg filter command (e.g., `-filter:v "setpts=3.0*PTS"`)

**Response (202):**
```json
{
  "task": "uuid-here"
}
```

### GET /status/:uuid
Check the processing status of a job.

**Response:**
```json
{
  "task": "uuid-here",
  "status": "PENDING|PROCESSING|COMPLETED|FAILED",
  "url": "/download/uuid-here or null",
  "error": "error message if failed"
}
```

### GET /download/:uuid
Download the processed video file. Triggers cleanup job with 1-hour delay.

**Response:**
Video file (MP4)

## Security

The API validates all FFmpeg commands to prevent command injection attacks. Only whitelisted filters are allowed:
- setpts, fps, scale, crop, rotate, hflip, vflip
- fade, trim, volume, equalizer
- brightness, contrast, saturation, hue
- drawtext, overlay

Commands containing shell metacharacters (`;`, `|`, `&&`, etc.) are rejected.

## Environment Variables

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=debug
```

