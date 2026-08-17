import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathQuery } from "#server/routes/files/path-body.ts";

import { readRawFile } from "./read-raw-file.ts";

export const rawFileHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request, reply) => {
    const query = request.query as FilesPathQuery;
    const { mimeType, content } = await readRawFile(assetTreeRoot, query.path ?? "");

    reply.type(mimeType);

    return content;
  });
