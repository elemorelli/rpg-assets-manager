import { createReadStream, type ReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathQuery } from "#server/routes/files/path-body.ts";
import { buildAttachmentDisposition } from "#server/utils/content-disposition.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { mimeTypeForFile } from "#utils/preview.ts";

const GENERIC_BINARY_MIME_TYPE = "application/octet-stream";

export interface FileDownload {
  fileName: string;
  mimeType: string;
  stream: ReadStream;
}

export const openFileDownload = async (
  rootDir: string,
  requestedPath: string,
): Promise<FileDownload> => {
  const relativePath = resolveSafeRelativePath(requestedPath);
  const absolutePath = path.join(rootDir, relativePath);
  const stat = await fs.stat(absolutePath);

  if (!stat.isFile()) {
    throw new HttpError("Only files can be downloaded directly", HTTP_STATUS.badRequest);
  }

  const fileName = path.basename(relativePath);
  const mimeType = mimeTypeForFile(fileName) ?? GENERIC_BINARY_MIME_TYPE;
  const stream = createReadStream(absolutePath);

  return { fileName, mimeType, stream };
};

export const downloadFileHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request, reply) => {
    const query = request.query as FilesPathQuery;
    const { fileName, mimeType, stream } = await openFileDownload(assetTreeRoot, query.path ?? "");

    reply.header("Content-Disposition", buildAttachmentDisposition(fileName));
    reply.type(mimeType);

    return reply.send(stream);
  });
