# Bruno API Collection

This folder contains Bruno HTTP client requests for testing the Video Modifier API.

## Setup

1. Install [Bruno](https://www.usebruno.com/)
2. Open Bruno and select "Open Collection"
3. Navigate to this `bruno` folder

## Environment

The collection uses the **Local** environment with:
- `baseUrl`: http://localhost:3000
- `taskId`: Auto-populated after running "Process Video" request

## Workflow

Run the requests in order:

1. **Process Video** - Upload a video file with an ffmpeg command
   - You'll need to provide a sample video file
   - The response's task UUID is automatically saved to `taskId`

2. **Check Status** - Monitor the processing status
   - Uses the `taskId` from the previous request
   - Run multiple times until status is COMPLETED

3. **Download Video** - Download the processed video
   - Only works when status is COMPLETED
   - Returns the processed video file

## Example FFmpeg Commands

```
# Slow motion (3x slower)
-filter:v "setpts=3.0*PTS"

# Fast motion (2x faster)
-filter:v "setpts=0.5*PTS"

# Scale to 720p
-vf "scale=1280:720"

# Crop to 640x480
-vf "crop=640:480:0:0"

# Rotate 90 degrees
-vf "rotate=90*PI/180"

# Horizontal flip
-vf "hflip"

# Grayscale/desaturate
-vf "hue=s=0"

# Complex filter chain
-vf "scale=1280:720,hue=s=0,fade=in:0:30"
```

## Downloading Videos

Bruno will display binary data in the response tab. To actually download the file:

1. **In Bruno**: Click the download icon (↓) in the response header area
2. **Using curl**: `curl -OJ http://localhost:3000/download/<taskId>`
3. **Using wget**: `wget --content-disposition http://localhost:3000/download/<taskId>`

The `-J` flag for curl and `--content-disposition` for wget tell them to use the filename from the `Content-Disposition` header (`<uuid>_output.mp4`).

## Notes

- Ensure Redis is running: `docker ps | grep redis`
- Ensure the API server is running: `pnpm dev` or `docker-compose up -d`
- For the "Process Video" request, you'll need to update the file path to point to an actual video file
