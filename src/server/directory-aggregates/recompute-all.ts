import { db } from "#server/db/index.ts";
import { walkDirectory } from "#server/utils/walk-directory.ts";
import { getAncestorPaths, getParentPath } from "#utils/directory-path.ts";

interface DirectoryAggregate {
  size: number;
  fileCount: number;
  folderCount: number;
}

const createEmptyAggregate = (): DirectoryAggregate => ({ size: 0, fileCount: 0, folderCount: 0 });

const buildAggregates = async (rootDir: string): Promise<Map<string, DirectoryAggregate>> => {
  const entries = await walkDirectory(rootDir);
  const assetSizes = new Map(
    (await db.selectFrom("assets").select(["path", "size"]).execute()).map((row) => [
      row.path,
      Number(row.size),
    ]),
  );

  const aggregates = new Map<string, DirectoryAggregate>();

  aggregates.set("", createEmptyAggregate());

  for (const entry of entries) {
    if (entry.dirent.isDirectory()) {
      aggregates.set(entry.relativePath, createEmptyAggregate());
    }
  }

  for (const entry of entries) {
    if (entry.dirent.isFile()) {
      const size = assetSizes.get(entry.relativePath) ?? 0;
      const parentDir = getParentPath(entry.relativePath);

      for (const ancestorPath of [parentDir, ...getAncestorPaths(parentDir)]) {
        const aggregate = aggregates.get(ancestorPath);

        if (aggregate) {
          aggregate.size += size;
          aggregate.fileCount += 1;
        }
      }

      continue;
    }

    for (const ancestorPath of getAncestorPaths(entry.relativePath)) {
      const aggregate = aggregates.get(ancestorPath);

      if (aggregate) {
        aggregate.folderCount += 1;
      }
    }
  }

  return aggregates;
};

export const recomputeAllDirectoryAggregates = async (rootDir: string): Promise<void> => {
  const aggregates = await buildAggregates(rootDir);
  const sortedPaths = [...aggregates.keys()].sort(
    (a, b) => a.split("/").length - b.split("/").length,
  );

  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("directories").execute();

    const idByPath = new Map<string, number>();

    for (const directoryPath of sortedPaths) {
      const parentPath = directoryPath === "" ? null : getParentPath(directoryPath);
      const parentId = parentPath === null ? null : (idByPath.get(parentPath) ?? null);
      const aggregate = aggregates.get(directoryPath);

      if (!aggregate) {
        continue;
      }

      const inserted = await trx
        .insertInto("directories")
        .values({
          path: directoryPath,
          parent_id: parentId,
          total_size: aggregate.size,
          file_count: aggregate.fileCount,
          folder_count: aggregate.folderCount,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      idByPath.set(directoryPath, Number(inserted.id));
    }
  });
};
