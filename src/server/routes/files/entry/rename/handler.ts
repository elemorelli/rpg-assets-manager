import { db } from "#server/db/index.ts";
import { withHttpErrorHandling } from "#server/errors/index.ts";

import { renameEntry } from "./rename-entry.ts";

interface RenameBody {
  path?: string;
  newName?: string;
}

export const renameEntryHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const body = request.body as RenameBody | undefined;

    await renameEntry(db, assetTreeRoot, body?.path ?? "", body?.newName ?? "");

    return { renamed: true };
  });
