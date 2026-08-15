import { withHttpErrorHandling } from "#server/errors/index.ts";
import { readRawFile } from "./read-raw-file.ts";

interface FilesPathQuery {
  path?: string;
}

export const rawFileHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request, reply) => {
    const query = request.query as FilesPathQuery;
    const { mimeType, content } = await readRawFile(assetTreeRoot, query.path ?? "");

    reply.type(mimeType);

    return content;
  });
