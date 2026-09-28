import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathQuery } from "#server/routes/files/path-body.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { sendAssetFile } from "#server/utils/send-asset-file.ts";
import { mimeTypeForFile } from "#utils/preview.ts";

export const rawFileHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request, reply) => {
    const query = request.query as FilesPathQuery;
    const relativePath = resolveSafeRelativePath(query.path ?? "");
    const mimeType = mimeTypeForFile(relativePath);

    if (!mimeType) {
      throw new HttpError("Unsupported file type", HTTP_STATUS.badRequest);
    }

    return sendAssetFile(request, reply, {
      rootDir: assetTreeRoot,
      relativePath,
      contentType: mimeType,
    });
  });
