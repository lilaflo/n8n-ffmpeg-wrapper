# Video Modifier

A REST API service for asynchronous video processing using FFmpeg. Upload a video file with an FFmpeg filter command, receive an immediate UUID response, and download the processed result when ready.

**Key Features:**
- Fast response times (~16ms) with background processing
- Support for any valid FFmpeg filter syntax
- Secure command validation to prevent injection attacks
- Bearer token authentication
- Automatic cleanup of processed files
- Built-in job queue with Redis and BullMQ


## How It Works

1. **Upload** (POST /process)
   - Client sends video file + FFmpeg filter command via multipart/form-data
   - Server validates command for security
   - UUID generated and returned immediately (~16ms response)
   - File saves to `/tmp/<UUID>.mpg` in background pipeline
   - BullMQ job automatically queued after file save completes

2. **Processing** (Background Worker)
   - Worker picks up job from Redis queue
   - Executes: `ffmpeg -i /tmp/<UUID>.mpg [your-filter] /tmp/<UUID>_output.mp4`
   - Updates job status in Redis: PENDING → PROCESSING → COMPLETED/FAILED

3. **Status Check** (GET /status/:uuid)
   - Returns current job status and executed FFmpeg command
   - Statuses: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`
   - Includes download URL when completed

4. **Download** (GET /download/:uuid)
   - Streams processed MP4 file to client
   - Schedules cleanup job (1 hour delay)

5. **Cleanup** (Background Worker)
   - Deletes both input and output files after 1 hour

## Technology Stack

- **Runtime**: Node.js 20 with TypeScript (ES2022 modules)
- **Package Manager**: pnpm
- **Web Framework**: Fastify with multipart support
- **Queue System**: BullMQ (backed by Redis)
- **Storage**: Redis for job status and queue management
- **Video Processing**: FFmpeg
- **Deployment**: Docker with docker-compose
- **Testing**: Vitest for unit and integration tests

## Quick Start

```bash
# Clone and start all services
docker-compose up -d

# View logs
docker-compose logs -f video-modifier

# Test the API (see Example Usage section below)
```

The service will be available at `http://localhost:3000`.

**What's Included:**
- `video-modifier`: API server with FFmpeg and BullMQ workers
- `redis`: Job queue and status storage (internal network only)
- Persistent volumes for Redis data and video files

## Development

### Using Docker (Recommended)

```bash
# Start services
docker-compose up -d

# View logs in real-time
docker-compose logs -f video-modifier

# Restart after code changes
docker-compose restart video-modifier

# Rebuild after dependency changes
docker-compose up -d --build

# Stop services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

### Local Development (Without Docker)

If you prefer to run locally without Docker:

```bash
# Install dependencies
pnpm install

# Start Redis separately
docker run -d -p 6379:6379 redis:7-alpine

# Set environment variables
export API_TOKEN=your-token-here

# Run in development mode
pnpm dev
```

### Testing

```bash
# Run unit tests (no Redis required)
pnpm test

# Run all tests including integration tests (requires Redis)
pnpm test:integration

# Watch mode for development
pnpm test:watch
```

## API Endpoints

All endpoints require Bearer token authentication except for GET /version.

**Authentication:**
- Header: `Authorization: Bearer <API_TOKEN>`
- Token configured via `API_TOKEN` environment variable
- Returns 401 if token is missing or invalid
- GET /version does not require authentication

### POST /merge
Merge an audio file with a video file, looping the video until the audio ends.

**Request:**
- Content-Type: `multipart/form-data`
- Headers:
  - `Authorization: Bearer <API_TOKEN>`
- Fields:
  - `video`: Video file (MP4 format)
  - `audio`: Audio file (MP3 format)

**Response (202):**
```json
{
  "task": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Processing Command:** `ffmpeg -stream_loop -1 -i video.mp4 -i audio.mp3 -shortest -map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac output.mp4`

**Notes:**
- Video loops continuously until audio track finishes
- Outputs MP4 with H.264 video and AAC audio
- Fast response time (~16ms) with background processing

### POST /process
Upload a video file and ffmpeg command for processing.

**Request:**
- Content-Type: `multipart/form-data`
- Headers:
  - `Authorization: Bearer <API_TOKEN>`
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

### POST /merge
Merge an audio file with a video file, looping the video until the audio ends.

**Request:**
- Content-Type: `multipart/form-data`
- Headers:
  - `Authorization: Bearer <API_TOKEN>`
- Fields:
  - `video`: Video file (MP4 format)
  - `audio`: Audio file (MP3 format)

**Response (202):**
```json
{
  "task": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Processing Command:** `ffmpeg -stream_loop -1 -i video.mp4 -i audio.mp3 -shortest -map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac output.mp4`

**Notes:**
- Video loops continuously until audio track finishes
- Outputs MP4 with H.264 video and AAC audio
- Fast response time (~16ms) with background processing

### GET /version
Get the current API version from package.json. This endpoint does not require authentication.

**Response:**
```json
{
  "version": "1.1.0"
}
```

**Fields:**
- `version`: The version string from package.json

**Example:**
```bash
curl http://localhost:3000/version
# {"version": "1.1.0"}
```

### GET /status/:uuid
Check the processing status of a job.

**Response:**
```json
{
  "task": "uuid-here",
  "status": "PENDING|PROCESSING|COMPLETED|FAILED",
  "url": "/download/uuid-here or null",
  "cmd": "ffmpeg -i /tmp/<uuid>.mpg -filter:v \"setpts=3.0*PTS\" /tmp/<uuid>_output.mp4",
  "error": "error message if failed"
}
```

**Fields:**
- `task`: Job UUID
- `status`: Current processing status
- `url`: Download URL (only present when COMPLETED)
- `cmd`: Full ffmpeg command being executed
- `error`: Error message (only present when FAILED)

### GET /download/:uuid
Download the processed video file.

**Response:**
- Content-Type: `video/mp4`
- Content-Disposition: `attachment; filename="<uuid>_output.mp4"`
- Body: Video file stream

**Note:** Triggers cleanup job to delete both input and output files after 1 hour.

## Example Usage

### Merge Audio and Video Files

```bash
# Set your API token
export API_TOKEN="your-secret-token-here"

# Merge audio with looping video
curl -X POST http://localhost:3000/merge \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "video=@video.mp4" \
  -F "audio=@audio.mp3"
# Response: {"task":"uuid-here"}

# Check status
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:3000/status/uuid-here
# Response: {"task":"uuid-here","status":"COMPLETED","url":"/download/uuid-here"}

# Download merged video (auto-detect filename from Content-Disposition header)
curl -OJ -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:3000/download/uuid-here
```

### Process Video with Filters

```bash
# Set your API token
export API_TOKEN="your-secret-token-here"

# Upload a video for slow-motion processing
curl -X POST http://localhost:3000/process \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "command=-filter:v \"setpts=3.0*PTS\"" \
  -F "file=@video.mp4"
# Response: {"task":"uuid-here"}

# Check status
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:3000/status/uuid-here
# Response: {"task":"uuid-here","status":"COMPLETED","url":"/download/uuid-here"}

# Download processed video (auto-detect filename from Content-Disposition header)
curl -OJ -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:3000/download/uuid-here

# Or specify output filename manually
curl -o output.mp4 -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:3000/download/uuid-here

# Using wget (respects Content-Disposition header)
wget --header="Authorization: Bearer $API_TOKEN" \
  --content-disposition http://localhost:3000/download/uuid-here
```

## Security

The service implements multiple security layers:

**Authentication:**
- Bearer token required for all endpoints
- Configured via `API_TOKEN` environment variable
- Returns 401 for invalid or missing tokens

**Command Injection Prevention:**
- Validates FFmpeg commands before execution
- Blocks shell metacharacters: `;`, `|`, `&&`
- Blocks command substitution: `$()`, backticks
- Blocks file redirects: `>`, `<`
- Blocks backslashes and dangerous keywords: `exec`, `eval`, `system`
- Maximum command length: 1000 characters
- Allows any valid FFmpeg filter syntax (e.g., `-vf`, `-filter:v`, `-af`)

**File System Security:**
- UUID-based file naming prevents path traversal
- Automatic cleanup prevents disk space exhaustion
- Docker volumes isolate file storage

**Network Security:**
- Redis port not exposed (internal network only)
- Only port 3000 exposed for API access

## Environment Variables

```bash
# Authentication
API_TOKEN=your-secret-token-here  # Required for all API requests

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



