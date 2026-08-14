import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { HTTP_STATUS, HttpError, respondToHttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { mimeTypeForFile } from "#utils/preview.ts";

export const readRawFile = async (
  rootDir: string,
  requestedPath: string,
): Promise<{ mimeType: string; content: Buffer }> => {
  const relativePath = resolveSafeRelativePath(requestedPath);
  const mimeType = mimeTypeForFile(relativePath);

  if (!mimeType) {
    throw new HttpError("Unsupported file type", HTTP_STATUS.badRequest);
  }

  const absolutePath = path.join(rootDir, relativePath);
  const content = await fs.readFile(absolutePath);

  return { mimeType, content };
};

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
