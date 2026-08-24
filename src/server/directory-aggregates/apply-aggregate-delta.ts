import { db } from "#server/db/index.ts";
import { getAncestorPaths } from "#utils/directory-path.ts";

export interface AggregateDelta {
  size: number;
  fileCount: number;
  folderCount: number;
}

export const applyAggregateDelta = async (
  startPath: string,
  delta: AggregateDelta,
): Promise<void> => {
  const targetPaths = [startPath, ...getAncestorPaths(startPath)];

  for (const targetPath of targetPaths) {
    const row = await db
      .selectFrom("directories")
      .select(["id", "total_size", "file_count", "folder_count"])
      .where("path", "=", targetPath)
      .executeTakeFirst();

    if (!row) {
      continue;
    }

    await db
      .updateTable("directories")
      .set({
        total_size: Number(row.total_size) + delta.size,
        file_count: row.file_count + delta.fileCount,
        folder_count: row.folder_count + delta.folderCount,
      })
      .where("id", "=", row.id)
      .execute();
  }
};
