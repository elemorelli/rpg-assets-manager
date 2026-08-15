import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathBody } from "#server/routes/files/path-body.ts";
import { deleteEntry } from "./delete-entry.ts";

export const deleteEntryHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const body = request.body as FilesPathBody | undefined;

    await deleteEntry(assetTreeRoot, body?.path ?? "");

    return { deleted: true };
  });
