import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { videoProcessQueue } from "../config/queues.js";
import { validateFfmpegCommand } from "../services/validation.js";
import { setJobStatus } from "../services/storage.js";
import { JobStatus } from "../types/index.js";

export async function processRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/process",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();
      const uuid = uuidv4();
      const inputPath = `/tmp/${uuid}.mpg`;
      const outputPath = `/tmp/${uuid}_output.mp4`;

      let command: string = "";
      let hasFile = false;

      try {
        console.debug(`[${uuid}] Starting request processing`);
        const parts = request.parts();

        for await (const part of parts) {
          const identifier =
            part.type === "file" ? part.filename : part.fieldname;
          console.debug(
            `[${uuid}] Processing part: ${part.type}, fieldname: ${identifier}`,
          );

          if (part.type === "file") {
            hasFile = true;
            const writeStream = createWriteStream(inputPath);

            pipeline(part.file, writeStream)
              .then(() => {
                console.debug(`File saved for job ${uuid}`);
                return videoProcessQueue.add("process-video", {
                  uuid,
                  inputPath,
                  outputPath,
                  command,
                });
              })
              .catch(async (error) => {
                console.debug("Error saving/queueing job", uuid, error);
                await setJobStatus(
                  uuid,
                  JobStatus.FAILED,
                  null,
                  "Failed to save or queue video",
                );
              });
          } else if (part.type === "field" && part.fieldname === "command") {
            command = part.value as string;
          }
        }

        if (!hasFile) {
          return reply.code(400).send({ error: "No file uploaded" });
        }

        if (!command) {
          return reply.code(400).send({ error: "No command provided" });
        }

        const validation = validateFfmpegCommand(command);
        if (!validation.valid) {
          return reply.code(400).send({ error: validation.error });
        }

        await setJobStatus(uuid, JobStatus.PENDING);

        const elapsed = Date.now() - startTime;
        console.debug(`[${uuid}] Request completed in ${elapsed}ms`);

        return reply.code(202).send({ task: uuid });
      } catch (error) {
        console.debug("Error in /process:", error);
        return reply.code(500).send({ error: "Failed to process upload" });
      }
    },
  );
}
