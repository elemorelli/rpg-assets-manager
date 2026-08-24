import { db } from "#server/db/index.ts";

export interface SubtreeContribution {
  size: number;
  fileCount: number;
  folderCount: number;
}

export const readSubtreeContribution = async (
  relativePath: string,
  isDirectory: boolean,
): Promise<SubtreeContribution> => {
  if (!isDirectory) {
    const row = await db
      .selectFrom("assets")
      .select("size")
      .where("path", "=", relativePath)
      .executeTakeFirst();

    return { size: row ? Number(row.size) : 0, fileCount: row ? 1 : 0, folderCount: 0 };
  }

  const row = await db
    .selectFrom("directories")
    .select(["total_size", "file_count", "folder_count"])
    .where("path", "=", relativePath)
    .executeTakeFirst();

  return {
    size: row ? Number(row.total_size) : 0,
    fileCount: row ? row.file_count : 0,
    folderCount: row ? row.folder_count + 1 : 0,
  };
};
