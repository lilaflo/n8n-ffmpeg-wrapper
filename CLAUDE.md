# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Video Modifier is an internal API endpoint for N8N that processes videos using ffmpeg commands. It accepts video binaries and ffmpeg filter commands, processes them asynchronously via BullMQ, and provides download URLs when complete.

## Technology Stack

- **Runtime**: Node.js with TypeScript (ES2022 modules)
- **Package Manager**: pnpm
- **Web Framework**: Fastify with multipart support
- **Queue System**: BullMQ (backed by Redis)
- **Storage**: Redis for job status (no sqlite3)
- **Video Processing**: ffmpeg
- **Deployment**: Docker with docker-compose
- **Testing**: Vitest for unit and integration tests

## Core Workflow Architecture

The service follows an asynchronous job processing pattern:

1. **Upload Phase**: POST /process receives multipart data
   - Generates UUID immediately
   - Returns UUID to caller (~16ms response time)
   - File saves to `/tmp/<UUID>.mpg` in background via pipeline
   - BullMQ job queued after file save completes
   - **Important**: Use `request.parts()` iterator, not `request.file()`

2. **Processing Phase**: BullMQ worker executes ffmpeg command
   - Command format: `ffmpeg -i /tmp/<UUID>.mpg [user-provided-filter] /tmp/<UUID>_output.mp4`
   - Updates job status in Redis (PENDING → PROCESSING → COMPLETED/FAILED)

3. **Status Check**: GET endpoint checks job status by UUID
   - Returns: `{ "task": "<UUID>", "status": "PENDING|COMPLETED|FAILED", "url": null|"<url>" }`

4. **Download Phase**: GET /download/:uuid streams processed video
   - Use `createReadStream()` with proper headers (Content-Type: video/mp4)
   - Triggers cleanup job (1 hour delay)
   - Cleanup removes both input and output files from container's `/tmp/`

## Security Considerations

- **Command Injection Prevention**: Implemented in `src/services/validation.ts`
  - Whitelisted ffmpeg filters only (setpts, scale, crop, rotate, etc.)
  - Blocks shell metacharacters: `;`, `|`, `&&`, `$()`, backticks, redirects
  - Max command length: 1000 characters
  - Requires `-filter:v` format with quoted filter string
- **File System**: UUID-based naming prevents collisions
- **Docker**: Redis port not exposed (internal network only)
- **Cleanup**: Automatic cleanup after 1 hour prevents volume bloat

## Development Commands

- `pnpm install` - Install dependencies
- `pnpm dev` - Run development server (requires local Redis)
- `pnpm build` - Build TypeScript to dist/
- `pnpm test` - Run unit tests (no Redis required)
- `pnpm test:integration` - Run all tests including Redis integration tests
- `docker-compose up -d` - Start all services in containers (recommended)
- `docker-compose logs -f video-modifier` - View application logs

## File Structure

```
src/
├── config/
│   ├── redis.ts          # Redis connection
│   └── queues.ts         # BullMQ queue instances
├── routes/
│   ├── process.ts        # POST /process - multipart upload
│   ├── status.ts         # GET /status/:uuid
│   └── download.ts       # GET /download/:uuid - stream video
├── services/
│   ├── validation.ts     # Command injection prevention
│   └── storage.ts        # Redis job status operations
├── workers/
│   ├── process-worker.ts # Video processing with ffmpeg
│   └── cleanup-worker.ts # File cleanup after 1 hour
├── types/
│   └── index.ts          # JobStatus enum, interfaces
└── index.ts              # Fastify server setup
```

## Important Implementation Details

1. **Multipart Handling**: Always iterate through `request.parts()` to handle both file and command field
2. **Background Processing**: Use `.then()` for file saving, don't await (fast response)
3. **Logging**: Use `console.debug()` for all logs (follows user's global instructions)
4. **Error Handling**: Catch pipeline errors and update job status to FAILED
5. **Testing**: Storage tests skip if `REDIS_RUNNING` env var not set

## Docker Architecture

- **video-uploads volume**: Persists `/tmp/` inside container
- **redis-data volume**: Persists Redis data
- **Internal network**: Redis not exposed to host
- **Port 3000**: Only exposed port for API access
