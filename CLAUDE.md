# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Video Modifier is an internal API endpoint for N8N that processes videos using ffmpeg commands. It accepts video binaries and ffmpeg filter commands, processes them asynchronously via BullMQ, and provides download URLs when complete.

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Package Manager**: pnpm
- **Web Framework**: Fastify
- **Queue System**: BullMQ (backed by Redis)
- **Database**: sqlite3 for state management
- **Video Processing**: ffmpeg
- **Deployment**: Docker

## Core Workflow Architecture

The service follows an asynchronous job processing pattern:

1. **Upload Phase**: POST endpoint receives video binary and ffmpeg command
   - Generates UUID for the job
   - Stores video at `/tmp/<UUID>.mpg`
   - Returns UUID to caller immediately
   - Enqueues BullMQ job for processing

2. **Processing Phase**: BullMQ worker executes ffmpeg command
   - Command format: `ffmpeg -i /tmp/<UUID>.mpg [user-provided-filter] /tmp/<UUID>_output.mp4`
   - Updates job status in sqlite3/Redis

3. **Status Check**: GET endpoint checks job status by UUID
   - Returns: `{ "task": "<UUID>", "status": "PENDING|COMPLETED|FAILED", "url": null|"<url>" }`

4. **Download Phase**: GET endpoint serves processed video
   - Triggers cleanup job (1 hour delay)
   - Cleanup removes both input and output files from `/tmp/`

## Security Considerations

- **Command Injection Risk**: User-provided ffmpeg commands must be validated/sanitized
- **File System**: All temporary files use UUID-based naming to prevent collisions
- **Cleanup**: Automatic cleanup prevents `/tmp/` bloat, 1-hour delay allows retries

## Development Commands

When implementing, use:
- `pnpm install` - Install dependencies
- `pnpm dev` - Run development server
- `pnpm build` - Build TypeScript
- `pnpm test` - Run test suite
- `pnpm test:watch` - Run tests in watch mode

## API Endpoints Design

The service should expose:
- `POST /process` - Upload video and command, returns UUID
- `GET /status/:uuid` - Check processing status
- `GET /download/:uuid` - Download processed video

## Queue Job Types

BullMQ jobs to implement:
1. **video-process**: Execute ffmpeg command on uploaded video
2. **cleanup**: Delete temporary files after 1-hour delay
