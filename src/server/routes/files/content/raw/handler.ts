import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "#server/errors/index.ts";
import { readRawFile } from "./read-raw-file.ts";

interface FilesPathQuery {
  path?: string;
}

export const rawFileHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as FilesPathQuery;

    try {
      const { mimeType, content } = await readRawFile(assetTreeRoot, query.path ?? "");

      reply.type(mimeType);

      return content;
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
