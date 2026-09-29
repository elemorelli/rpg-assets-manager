import fs from "node:fs/promises";
import path from "node:path";

import { walkDirectory } from "#server/utils/walk-directory.ts";

import { findEmptyDirectories } from "./empty-directories.ts";

const NOT_EMPTY_ERROR_CODE = "ENOTEMPTY";

const isNotEmptyError = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === NOT_EMPTY_ERROR_CODE;

export const removeEmptyDirectories = async (rootDir: string): Promise<number> => {
  const entries = await walkDirectory(rootDir);
  const treeEntries = entries.map((entry) => ({
    relativePath: entry.relativePath,
    isDirectory: entry.dirent.isDirectory(),
  }));

  const emptyDirectories = findEmptyDirectories(treeEntries);
  let removedCount = 0;

  for (const relativePath of emptyDirectories) {
    try {
      await fs.rmdir(path.join(rootDir, relativePath));
      removedCount += 1;
    } catch (error) {
      // rmdir refuses a directory that gained a file since the walk, which just means it is no longer empty.
      if (!isNotEmptyError(error)) {
        throw error;
      }
    }
  }

  return removedCount;
};
