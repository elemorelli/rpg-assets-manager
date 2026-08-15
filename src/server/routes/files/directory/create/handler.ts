import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "#server/errors/index.ts";
import type { FilesPathBody } from "#server/routes/files/path-body.ts";
import { createDirectory } from "./create-directory.ts";

export const createDirectoryHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as FilesPathBody | undefined;

    try {
      await createDirectory(assetTreeRoot, body?.path ?? "");

      return { created: true };
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
