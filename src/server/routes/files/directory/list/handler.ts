import { withHttpErrorHandling } from "#server/errors/index.ts";

import { listDirectory } from "./list-directory.ts";

interface FilesPathQuery {
  path?: string;
}

export const listDirectoryHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const query = request.query as FilesPathQuery;

    return await listDirectory(assetTreeRoot, query.path ?? "");
  });
