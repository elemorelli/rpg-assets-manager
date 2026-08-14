import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { HTTP_STATUS, HttpError, respondToHttpError } from "#server/errors/index.ts";
import { hashBuffer } from "#server/utils/hash.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { classifyPreviewKind, thumbnailCacheFileName } from "#utils/preview.ts";
import { generateThumbnail } from "./generate-thumbnail.ts";

const cacheFileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);

    return true;
  } catch {
    return false;
  }
};

export const resolveThumbnail = async (
  assetTreeRoot: string,
  thumbnailCacheDir: string,
  requestedPath: string,
): Promise<string> => {
  const relativePath = resolveSafeRelativePath(requestedPath);

  if (classifyPreviewKind(relativePath) !== "image") {
    throw new HttpError("Thumbnails are only available for images", HTTP_STATUS.badRequest);
  }

  const absoluteSourcePath = path.join(assetTreeRoot, relativePath);
  const sourceContent = await fs.readFile(absoluteSourcePath);
  const hash = await hashBuffer(sourceContent);
  const cachePath = path.join(thumbnailCacheDir, thumbnailCacheFileName(hash));

  if (await cacheFileExists(cachePath)) {
    return cachePath;
  }

  await fs.mkdir(thumbnailCacheDir, { recursive: true });
  await generateThumbnail(absoluteSourcePath, cachePath);

  return cachePath;
};

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
