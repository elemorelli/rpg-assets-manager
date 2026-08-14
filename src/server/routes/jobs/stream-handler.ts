import type { FastifyReply, FastifyRequest } from "fastify";
import { formatJobEvent } from "#utils/job.ts";
import { HTTP_STATUS } from "../../errors/index.ts";
import { getCurrentJob, subscribeToJobChanges } from "./store.ts";

export const jobsStreamHandler = (request: FastifyRequest, reply: FastifyReply): void => {
  reply.hijack();
  reply.raw.writeHead(HTTP_STATUS.ok, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  reply.raw.write(formatJobEvent(getCurrentJob()));

  const unsubscribe = subscribeToJobChanges((job) => {
    reply.raw.write(formatJobEvent(job));
  });

  request.raw.on("close", unsubscribe);
};
