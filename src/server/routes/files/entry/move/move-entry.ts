import fs from "node:fs/promises";
import path from "node:path";
import { type Kysely, sql } from "kysely";

import { invalidateLocalHashIndex } from "#server/asset-index-cache/index.ts";
import type { DB } from "#server/db/index.ts";
import { applyAggregateDelta } from "#server/directory-aggregates/apply-aggregate-delta.ts";
import { ensureDirectoryChain } from "#server/directory-aggregates/ensure-directory-chain.ts";
import { readSubtreeContribution } from "#server/directory-aggregates/read-subtree-contribution.ts";
import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";
import { pathExists } from "#server/utils/path-exists.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { getParentPath } from "#utils/directory-path.ts";

export const moveEntry = async (
  db: Kysely<DB>,
  rootDir: string,
  fromPath: string,
  toPath: string,
): Promise<void> => {
  const relativeFrom = resolveSafeRelativePath(fromPath);
  const relativeTo = resolveSafeRelativePath(toPath);

  if (relativeFrom === "") {
    throw new HttpError("Cannot move the asset tree root", HTTP_STATUS.badRequest);
  }

  if (relativeTo === "") {
    throw new HttpError("Cannot move onto the asset tree root", HTTP_STATUS.badRequest);
  }

  const absoluteFrom = path.join(rootDir, relativeFrom);
  const absoluteTo = path.join(rootDir, relativeTo);

  const destinationExists = await pathExists(absoluteTo);

  if (destinationExists) {
    throw new HttpError(`Destination already exists: ${relativeTo}`, HTTP_STATUS.conflict);
  }

  const stat = await fs.stat(absoluteFrom);
  const isDirectory = stat.isDirectory();
  const contribution = await readSubtreeContribution(db, relativeFrom, isDirectory);

  await fs.mkdir(path.dirname(absoluteTo), { recursive: true });
  await fs.rename(absoluteFrom, absoluteTo);

  // "relativeFrom" may be a file or a directory: rewrite the exact match (a
  // moved file) and every path nested under it (a moved directory's contents)
  // in one statement, since a rename never touches file content or hash.
  const descendantPrefix = `${relativeFrom}/`;
  const descendantLikePattern = `${descendantPrefix}%`;
  const descendantSubstringStart = descendantPrefix.length + 1;
  const newDescendantPrefix = `${relativeTo}/`;

  await sql`
    UPDATE assets
    SET path = CASE
      WHEN path = ${relativeFrom} THEN ${relativeTo}
      ELSE ${newDescendantPrefix} || substr(path, ${descendantSubstringStart})
    END
    WHERE path = ${relativeFrom} OR path LIKE ${descendantLikePattern}
  `.execute(db);

  await applyAggregateDelta(db, getParentPath(relativeFrom), {
    size: -contribution.size,
    fileCount: -contribution.fileCount,
    folderCount: -contribution.folderCount,
  });

  const newParentId = await ensureDirectoryChain(db, getParentPath(relativeTo));

  if (isDirectory) {
    await sql`
      UPDATE directories
      SET
        path = CASE
          WHEN path = ${relativeFrom} THEN ${relativeTo}
          ELSE ${newDescendantPrefix} || substr(path, ${descendantSubstringStart})
        END,
        parent_id = CASE WHEN path = ${relativeFrom} THEN ${newParentId} ELSE parent_id END
      WHERE path = ${relativeFrom} OR path LIKE ${descendantLikePattern}
    `.execute(db);
  }

  await applyAggregateDelta(db, getParentPath(relativeTo), contribution);

  invalidateLocalHashIndex(db);
};
