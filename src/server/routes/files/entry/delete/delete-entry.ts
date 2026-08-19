import fs from "node:fs/promises";
import path from "node:path";
import type { Kysely } from "kysely";

import { invalidateLocalHashIndex } from "#server/asset-index-cache/index.ts";
import type { DB } from "#server/db/index.ts";
import { applyAggregateDelta } from "#server/directory-aggregates/apply-aggregate-delta.ts";
import { readSubtreeContribution } from "#server/directory-aggregates/read-subtree-contribution.ts";
import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { getParentPath } from "#utils/directory-path.ts";

export const deleteEntry = async (
  db: Kysely<DB>,
  rootDir: string,
  requestedPath: string,
): Promise<void> => {
  const relativePath = resolveSafeRelativePath(requestedPath);

  if (relativePath === "") {
    throw new HttpError("Cannot delete the asset tree root", HTTP_STATUS.badRequest);
  }

  const absolutePath = path.join(rootDir, relativePath);
  const stat = await fs.stat(absolutePath);
  const contribution = await readSubtreeContribution(db, relativePath, stat.isDirectory());

  await fs.rm(absolutePath, { recursive: true, force: false });

  // "relativePath" may be a file or a directory: remove the exact match and
  // every path nested under it in one statement.
  const descendantLikePattern = `${relativePath}/%`;

  await db
    .deleteFrom("assets")
    .where((eb) =>
      eb.or([eb("path", "=", relativePath), eb("path", "like", descendantLikePattern)]),
    )
    .execute();

  await db
    .deleteFrom("directories")
    .where((eb) =>
      eb.or([eb("path", "=", relativePath), eb("path", "like", descendantLikePattern)]),
    )
    .execute();

  await applyAggregateDelta(db, getParentPath(relativePath), {
    size: -contribution.size,
    fileCount: -contribution.fileCount,
    folderCount: -contribution.folderCount,
  });

  invalidateLocalHashIndex(db);
};
