import { db } from "#server/db/index.ts";
import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathQuery } from "#server/routes/files/path-body.ts";

import { listDirectory } from "./list-directory.ts";

export const listDirectoryHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const query = request.query as FilesPathQuery;

    return await listDirectory(db, assetTreeRoot, query.path ?? "");
  });
