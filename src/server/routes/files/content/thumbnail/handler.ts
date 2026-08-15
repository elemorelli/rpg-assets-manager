import fs from "node:fs/promises";
import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "#server/errors/index.ts";
import { resolveThumbnail } from "./resolve-thumbnail.ts";

interface FilesPathQuery {
  path?: string;
}

export const thumbnailHandler =
  (assetTreeRoot: string, thumbnailCacheDir: string) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as FilesPathQuery;

    try {
      const cachePath = await resolveThumbnail(assetTreeRoot, thumbnailCacheDir, query.path ?? "");
      const content = await fs.readFile(cachePath);

      reply.type("image/webp");

      return content;
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
