import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "#server/errors/index.ts";
import { formatJobEvent } from "#utils/job.ts";

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
