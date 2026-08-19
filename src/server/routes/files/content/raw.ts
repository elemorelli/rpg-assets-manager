import fs from "node:fs/promises";
import path from "node:path";

import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathQuery } from "#server/routes/files/path-body.ts";
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

export const rawFileHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request, reply) => {
    const query = request.query as FilesPathQuery;
    const { mimeType, content } = await readRawFile(assetTreeRoot, query.path ?? "");

    reply.type(mimeType);

    return content;
  });
