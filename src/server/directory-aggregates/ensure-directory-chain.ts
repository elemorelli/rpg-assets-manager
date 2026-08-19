import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";

const findDirectoryId = async (
  db: Kysely<DB>,
  directoryPath: string,
): Promise<number | undefined> => {
  const row = await db
    .selectFrom("directories")
    .select("id")
    .where("path", "=", directoryPath)
    .executeTakeFirst();

  return row ? Number(row.id) : undefined;
};

const insertDirectory = async (
  db: Kysely<DB>,
  directoryPath: string,
  parentId: number | null,
): Promise<number> => {
  const inserted = await db
    .insertInto("directories")
    .values({
      path: directoryPath,
      parent_id: parentId,
      total_size: 0,
      file_count: 0,
      folder_count: 0,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return Number(inserted.id);
};

const ensureDirectoryRow = async (
  db: Kysely<DB>,
  directoryPath: string,
  parentId: number | null,
): Promise<number> => {
  const existingId = await findDirectoryId(db, directoryPath);

  if (existingId !== undefined) {
    return existingId;
  }

  return insertDirectory(db, directoryPath, parentId);
};

export const ensureDirectoryChain = async (
  db: Kysely<DB>,
  directoryPath: string,
): Promise<number> => {
  let directoryId = await ensureDirectoryRow(db, "", null);

  if (directoryPath === "") {
    return directoryId;
  }

  const segments = directoryPath.split("/");
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath === "" ? segment : `${currentPath}/${segment}`;
    directoryId = await ensureDirectoryRow(db, currentPath, directoryId);
  }

  return directoryId;
};
