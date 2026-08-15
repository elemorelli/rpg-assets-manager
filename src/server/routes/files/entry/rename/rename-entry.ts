import path from "node:path";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { moveEntry } from "../move/index.ts";

export const renameEntry = async (
  rootDir: string,
  requestedPath: string,
  newName: string,
): Promise<void> => {
  const currentPath = resolveSafeRelativePath(requestedPath);
  const newPath = path.posix.join(path.posix.dirname(currentPath), newName);

  await moveEntry(rootDir, currentPath, newPath);
};
