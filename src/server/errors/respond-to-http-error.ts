import type { FastifyReply } from "fastify";
import { UnsafePathError } from "../utils/safe-path.ts";
import { HttpError } from "./http-error.ts";
import { HTTP_STATUS } from "./http-status.ts";

const NODE_ERROR_STATUS: Record<string, number> = {
  ENOENT: HTTP_STATUS.notFound,
  EEXIST: HTTP_STATUS.conflict,
  ENOTEMPTY: HTTP_STATUS.conflict,
};

const isNodeErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;

export const respondToHttpError = (error: unknown, reply: FastifyReply): void => {
  if (error instanceof UnsafePathError) {
    reply.code(HTTP_STATUS.badRequest).send({ error: error.message });

    return;
  }

  if (error instanceof HttpError) {
    reply.code(error.statusCode).send({ error: error.message });

    return;
  }

  const errorCode = isNodeErrnoException(error) ? error.code : undefined;
  const statusForCode = errorCode ? NODE_ERROR_STATUS[errorCode] : undefined;

  if (statusForCode) {
    reply.code(statusForCode).send({ error: (error as Error).message });

    return;
  }

  throw error;
};
