import fs from "node:fs/promises";
import path from "node:path";
import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";
import { applyAggregateDelta } from "#server/directory-aggregates/apply-aggregate-delta.ts";
import { ensureDirectoryChain } from "#server/directory-aggregates/ensure-directory-chain.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { getParentPath } from "#utils/directory-path.ts";

export const createDirectory = async (
  db: Kysely<DB>,
  rootDir: string,
  requestedPath: string,
): Promise<void> => {
  const relativePath = resolveSafeRelativePath(requestedPath);
  const absolutePath = path.join(rootDir, relativePath);

  await fs.mkdir(absolutePath, { recursive: false });

  await ensureDirectoryChain(db, relativePath);
  await applyAggregateDelta(db, getParentPath(relativePath), {
    size: 0,
    fileCount: 0,
    folderCount: 1,
  });
};
