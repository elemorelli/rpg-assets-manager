import { db } from "#server/db/index.ts";
import { withHttpErrorHandling } from "#server/errors/index.ts";

import { moveEntry } from "./move-entry.ts";

interface MoveBody {
  fromPath?: string;
  toPath?: string;
}

export const moveEntryHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const body = request.body as MoveBody | undefined;

    await moveEntry(db, assetTreeRoot, body?.fromPath ?? "", body?.toPath ?? "");

    return { moved: true };
  });
