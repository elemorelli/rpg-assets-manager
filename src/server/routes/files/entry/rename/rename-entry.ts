import path from "node:path";
import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

import { moveEntry } from "../move/index.ts";

export const renameEntry = async (
  db: Kysely<DB>,
  rootDir: string,
  requestedPath: string,
  newName: string,
): Promise<void> => {
  const currentPath = resolveSafeRelativePath(requestedPath);
  const newPath = path.posix.join(path.posix.dirname(currentPath), newName);

  await moveEntry(db, rootDir, currentPath, newPath);
};
