import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { mergeQueue } from "../config/queues.js";
import { setJobStatus } from "../services/storage.js";
import { JobStatus } from "../types/index.js";
import { authenticateRequest } from "../middleware/auth.js";

export async function mergeRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/merge",
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();
      const uuid = uuidv4();
      const videoPath = `/tmp/${uuid}_video.mp4`;
      const audioPath = `/tmp/${uuid}_audio.mp3`;
      const outputPath = `/tmp/${uuid}_output.mp4`;

      let hasVideo = false;
      let hasAudio = false;

      try {
        console.debug(`[${uuid}] Starting merge request processing`);
        const parts = request.parts();

        for await (const part of parts) {
          const identifier =
            part.type === "file" ? part.filename : part.fieldname;
          console.debug(
            `[${uuid}] Processing part: ${part.type}, fieldname: ${identifier}`,
          );

          if (part.type === "file") {
            if (part.fieldname === "video") {
              hasVideo = true;
              const writeStream = createWriteStream(videoPath);
              await pipeline(part.file, writeStream);
              console.debug(`Video saved for job ${uuid}`);
            } else if (part.fieldname === "audio") {
              hasAudio = true;
              const writeStream = createWriteStream(audioPath);
              await pipeline(part.file, writeStream);
              console.debug(`Audio saved for job ${uuid}`);
            }
          }
        }

        if (!hasVideo) {
          return reply.code(400).send({ error: "No video file uploaded" });
        }

        if (!hasAudio) {
          return reply.code(400).send({ error: "No audio file uploaded" });
        }

        const ffmpegCmd = `ffmpeg -stream_loop -1 -i ${videoPath} -i ${audioPath} -shortest -map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac ${outputPath}`;
        await setJobStatus(uuid, JobStatus.PENDING, null, undefined, ffmpegCmd);

        await mergeQueue.add("merge-video-audio", {
          uuid,
          videoPath,
          audioPath,
          outputPath,
        });

        const elapsed = Date.now() - startTime;
        console.debug(`[${uuid}] Merge request completed in ${elapsed}ms`);

        return reply.code(202).send({ task: uuid });
      } catch (error) {
        console.debug("Error in /merge:", error);
        return reply.code(500).send({ error: "Failed to process merge upload" });
      }
    },
  );
}