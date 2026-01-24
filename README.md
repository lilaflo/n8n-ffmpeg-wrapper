# Video Modifier

This is an internal API endpoint for N8N which accepts a Video (binary) and a command to be executed on the binary, containing ffmpeg instructions like `-filter:v "setpts=3.0*PTS"`.
Internally, this stores the video at /tmp/video.mpg, then applies the command (for this example: `ffmpeg -i /tmp/input.mp4 -filter:v "setpts=3.0*PTS" -an /tmp/output.mp4`).


## Workflow

1. **Upload**: POST /process accepts video and ffmpeg command
2. **Immediate Response**: UUID returned immediately (~16ms)
3. **Background Processing**:
   - File saved to `/tmp/<UUID>.mpg` in background
   - BullMQ job queued for video processing
4. **Status Check**: GET /status/:uuid returns job status
   - `PENDING`: Job queued, file being saved
   - `PROCESSING`: FFmpeg actively processing video
   - `COMPLETED`: Processing done, ready for download
   - `FAILED`: Processing failed (see error field)
5. **Download**: GET /download/:uuid streams processed video
6. **Cleanup**: 1 hour after download, both input and output files deleted

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

## Production (Docker)

```bash
# Start all services (recommended)
docker-compose up -d

# View logs
docker-compose logs -f video-modifier

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

**Docker Services:**
- `video-modifier`: API server with FFmpeg and BullMQ workers
- `redis`: Job queue and status storage (internal only, not exposed)

**Docker Volumes:**
- `redis-data`: Persistent Redis data
- `video-uploads`: Video files stored in `/tmp` inside container

## API Endpoints

### POST /process
Upload a video file and ffmpeg command for processing.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `command`: FFmpeg filter command (e.g., `-filter:v "setpts=3.0*PTS"`)
  - `file`: Video file (binary)

**Note:** Send `command` field before `file` for optimal performance.

**Response (202):**
```json
{
  "task": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Performance:** ~16ms response time (file saves in background)

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
Download the processed video file.

**Response:**
- Content-Type: `video/mp4`
- Content-Disposition: `attachment; filename="<uuid>_output.mp4"`
- Body: Video file stream

**Note:** Triggers cleanup job to delete both input and output files after 1 hour.

## Security

The API validates all FFmpeg commands to prevent command injection attacks. Only whitelisted filters are allowed:
- setpts, fps, scale, crop, rotate, hflip, vflip
- fade, trim, volume, equalizer
- brightness, contrast, saturation, hue
- drawtext, overlay

Commands containing shell metacharacters (`;`, `|`, `&&`, etc.) are rejected.

## Environment Variables

```bash
# Redis connection (docker-compose sets to "redis")
REDIS_HOST=localhost
REDIS_PORT=6379

# API server
PORT=3000
HOST=0.0.0.0

# Logging
LOG_LEVEL=debug  # or info, warn, error
```

## Testing with Bruno

A complete API collection is available in the `bruno/` folder:

1. Install [Bruno](https://www.usebruno.com/)
2. Open Collection → Select the `bruno` folder
3. Ensure Docker containers are running: `docker-compose up -d`
4. Run requests in order:
   - **Process Video** → Returns task UUID
   - **Check Status** → Monitor processing
   - **Download Video** → Get processed file

See `bruno/README.md` for example ffmpeg commands.

## Example Usage

```bash
# Upload a video for slow-motion processing
curl -X POST http://localhost:3000/process \
  -F "command=-filter:v \"setpts=3.0*PTS\"" \
  -F "file=@video.mp4"
# Response: {"task":"uuid-here"}

# Check status
curl http://localhost:3000/status/uuid-here
# Response: {"task":"uuid-here","status":"COMPLETED","url":"/download/uuid-here"}

# Download processed video (auto-detect filename from Content-Disposition header)
curl -OJ http://localhost:3000/download/uuid-here

# Or specify output filename manually
curl -o output.mp4 http://localhost:3000/download/uuid-here

# Using wget (respects Content-Disposition header)
wget --content-disposition http://localhost:3000/download/uuid-here
```

