import path from "node:path";

import { withHttpErrorHandling } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

import { moveEntry } from "./move.ts";

export const renameEntry = async (
  rootDir: string,
  requestedPath: string,
  newName: string,
): Promise<void> => {
  const currentPath = resolveSafeRelativePath(requestedPath);
  const newPath = path.posix.join(path.posix.dirname(currentPath), newName);

  await moveEntry(rootDir, currentPath, newPath);
};

interface RenameBody {
  path?: string;
  newName?: string;
}

export const renameEntryHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const body = request.body as RenameBody | undefined;

    await renameEntry(assetTreeRoot, body?.path ?? "", body?.newName ?? "");

    return { renamed: true };
  });
