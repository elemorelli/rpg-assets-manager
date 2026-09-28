import path from "node:path";

import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathQuery } from "#server/routes/files/path-body.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { sendAssetFile } from "#server/utils/send-asset-file.ts";
import { mimeTypeForFile } from "#utils/preview.ts";

const GENERIC_BINARY_MIME_TYPE = "application/octet-stream";

export const downloadFileHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request, reply) => {
    const query = request.query as FilesPathQuery;
    const relativePath = resolveSafeRelativePath(query.path ?? "");
    const fileName = path.posix.basename(relativePath);
    const mimeType = mimeTypeForFile(fileName) ?? GENERIC_BINARY_MIME_TYPE;

    return sendAssetFile(request, reply, {
      rootDir: assetTreeRoot,
      relativePath,
      contentType: mimeType,
      attachmentName: fileName,
    });
  });
