import { db } from "#server/db/index.ts";

const findDirectoryId = async (directoryPath: string): Promise<number | undefined> => {
  const row = await db
    .selectFrom("directories")
    .select("id")
    .where("path", "=", directoryPath)
    .executeTakeFirst();

  return row ? Number(row.id) : undefined;
};

const insertDirectory = async (directoryPath: string, parentId: number | null): Promise<number> => {
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
  directoryPath: string,
  parentId: number | null,
): Promise<number> => {
  const existingId = await findDirectoryId(directoryPath);

  if (existingId !== undefined) {
    return existingId;
  }

  return insertDirectory(directoryPath, parentId);
};

export const ensureDirectoryChain = async (directoryPath: string): Promise<number> => {
  let directoryId = await ensureDirectoryRow("", null);

  if (directoryPath === "") {
    return directoryId;
  }

  const segments = directoryPath.split("/");
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath === "" ? segment : `${currentPath}/${segment}`;
    directoryId = await ensureDirectoryRow(currentPath, directoryId);
  }

  return directoryId;
};
