import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "#server/errors/index.ts";
import { listDirectory } from "./list-directory.ts";

interface FilesPathQuery {
  path?: string;
}

export const listDirectoryHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as FilesPathQuery;

    try {
      return await listDirectory(assetTreeRoot, query.path ?? "");
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
