import fs from "node:fs/promises";
import path from "node:path";
import { type Kysely, sql } from "kysely";

import { invalidateLocalHashIndex } from "#server/asset-index-cache/index.ts";
import { type DB, db } from "#server/db/index.ts";
import { applyAggregateDelta } from "#server/directory-aggregates/apply-aggregate-delta.ts";
import { ensureDirectoryChain } from "#server/directory-aggregates/ensure-directory-chain.ts";
import { readSubtreeContribution } from "#server/directory-aggregates/read-subtree-contribution.ts";
import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";
import { pathExists } from "#server/utils/path-exists.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { getParentPath } from "#utils/directory-path.ts";

// Moves "relativeFrom" onto "relativeTo" where "relativeTo" is known not to
// exist yet: a single rename plus a bulk path rewrite for the subtree. Used
// both for a plain (non-conflicting) move and, recursively, for each
// non-conflicting child encountered while merging directories.
const moveSubtree = async (
  db: Kysely<DB>,
  rootDir: string,
  relativeFrom: string,
  relativeTo: string,
): Promise<void> => {
  const absoluteFrom = path.join(rootDir, relativeFrom);
  const absoluteTo = path.join(rootDir, relativeTo);

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
};

// Replaces the file at "relativeTo" with the file at "relativeFrom". The
// destination's own asset row is dropped first so the source row can take
// over its path, and the destination parent's aggregate only nets the size
// difference: one file is leaving and one is arriving, so the file count
// there does not change.
const overwriteFile = async (
  db: Kysely<DB>,
  rootDir: string,
  relativeFrom: string,
  relativeTo: string,
): Promise<void> => {
  const absoluteFrom = path.join(rootDir, relativeFrom);
  const absoluteTo = path.join(rootDir, relativeTo);

  const contribution = await readSubtreeContribution(db, relativeFrom, false);
  const existingDestinationRow = await db
    .selectFrom("assets")
    .select("size")
    .where("path", "=", relativeTo)
    .executeTakeFirst();
  const existingDestinationSize = existingDestinationRow ? Number(existingDestinationRow.size) : 0;

  await db.deleteFrom("assets").where("path", "=", relativeTo).execute();
  await fs.rename(absoluteFrom, absoluteTo);

  await db
    .updateTable("assets")
    .set({ path: relativeTo })
    .where("path", "=", relativeFrom)
    .execute();

  await applyAggregateDelta(db, getParentPath(relativeFrom), {
    size: -contribution.size,
    fileCount: -contribution.fileCount,
    folderCount: 0,
  });

  await applyAggregateDelta(db, getParentPath(relativeTo), {
    size: contribution.size - existingDestinationSize,
    fileCount: 0,
    folderCount: 0,
  });
};

// Merges every entry directly under "relativeFrom" into "relativeTo",
// recursing into "mergeInto" for names that already exist at the
// destination and taking the fast "moveSubtree" path for names that don't.
// Once every child has been moved out, "relativeFrom" is an empty directory
// on disk and a zeroed-out row in the database, both of which are dropped.
const mergeDirectories = async (
  db: Kysely<DB>,
  rootDir: string,
  relativeFrom: string,
  relativeTo: string,
): Promise<void> => {
  const absoluteFrom = path.join(rootDir, relativeFrom);
  const childNames = await fs.readdir(absoluteFrom);

  for (const childName of childNames) {
    const childFrom = `${relativeFrom}/${childName}`;
    const childTo = `${relativeTo}/${childName}`;
    const childDestinationExists = await pathExists(path.join(rootDir, childTo));

    if (childDestinationExists) {
      await mergeInto(db, rootDir, childFrom, childTo);
    } else {
      await moveSubtree(db, rootDir, childFrom, childTo);
    }
  }

  await fs.rmdir(absoluteFrom);
  await db.deleteFrom("directories").where("path", "=", relativeFrom).execute();
};

// Dispatches an overwrite onto an existing destination: same-type entries
// overwrite (a file replaces a file) or merge (a directory merges into a
// directory), while a type mismatch is always a conflict, overwrite or not.
const mergeInto = async (
  db: Kysely<DB>,
  rootDir: string,
  relativeFrom: string,
  relativeTo: string,
): Promise<void> => {
  const absoluteFrom = path.join(rootDir, relativeFrom);
  const absoluteTo = path.join(rootDir, relativeTo);
  const [fromStat, toStat] = await Promise.all([fs.stat(absoluteFrom), fs.stat(absoluteTo)]);

  if (fromStat.isDirectory() !== toStat.isDirectory()) {
    const sourceKind = fromStat.isDirectory() ? "directory" : "file";
    const destinationKind = toStat.isDirectory() ? "directory" : "file";

    throw new HttpError(
      `Cannot overwrite ${destinationKind} "${relativeTo}" with ${sourceKind} "${relativeFrom}"`,
      HTTP_STATUS.conflict,
    );
  }

  if (fromStat.isDirectory()) {
    await mergeDirectories(db, rootDir, relativeFrom, relativeTo);
  } else {
    await overwriteFile(db, rootDir, relativeFrom, relativeTo);
  }
};

export const moveEntry = async (
  db: Kysely<DB>,
  rootDir: string,
  fromPath: string,
  toPath: string,
  overwrite = false,
): Promise<void> => {
  const relativeFrom = resolveSafeRelativePath(fromPath);
  const relativeTo = resolveSafeRelativePath(toPath);

  if (relativeFrom === "") {
    throw new HttpError("Cannot move the asset tree root", HTTP_STATUS.badRequest);
  }

  if (relativeTo === "") {
    throw new HttpError("Cannot move onto the asset tree root", HTTP_STATUS.badRequest);
  }

  const absoluteTo = path.join(rootDir, relativeTo);
  const destinationExists = await pathExists(absoluteTo);

  if (destinationExists && !overwrite) {
    throw new HttpError(`Destination already exists: ${relativeTo}`, HTTP_STATUS.conflict);
  }

  if (destinationExists) {
    await mergeInto(db, rootDir, relativeFrom, relativeTo);
  } else {
    await moveSubtree(db, rootDir, relativeFrom, relativeTo);
  }

  invalidateLocalHashIndex(db);
};

interface MoveBody {
  fromPath?: string;
  toPath?: string;
  overwrite?: boolean;
}

export const moveEntryHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const body = request.body as MoveBody | undefined;

    await moveEntry(
      db,
      assetTreeRoot,
      body?.fromPath ?? "",
      body?.toPath ?? "",
      body?.overwrite ?? false,
    );

    return { moved: true };
  });
