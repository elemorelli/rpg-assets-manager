import { invalidateLocalHashIndex } from "#server/asset-index-cache/index.ts";
import { db } from "#server/db/index.ts";
import { applyAggregateDelta } from "#server/directory-aggregates/apply-aggregate-delta.ts";
import { ensureDirectoryChain } from "#server/directory-aggregates/ensure-directory-chain.ts";
import { getParentPath } from "#utils/directory-path.ts";

export interface RegisteredAssetFile {
  size: number;
  mtime: Date;
  hash: string;
  tags?: string[];
}

// Upload omits tags so overwriting a file keeps the tags it already had.
export const registerAssetFile = async (
  relativePath: string,
  file: RegisteredAssetFile,
): Promise<void> => {
  const previousRow = await db
    .selectFrom("assets")
    .select("size")
    .where("path", "=", relativePath)
    .executeTakeFirst();
  const previousSize = previousRow ? Number(previousRow.size) : undefined;
  const tagColumns = file.tags === undefined ? {} : { tags: file.tags };

  await db
    .insertInto("assets")
    .values({
      path: relativePath,
      size: file.size,
      mtime: file.mtime,
      hash: file.hash,
      ...tagColumns,
    })
    .onConflict((oc) =>
      oc.column("path").doUpdateSet({
        size: file.size,
        mtime: file.mtime,
        hash: file.hash,
        scanned_at: new Date(),
        ...tagColumns,
      }),
    )
    .execute();

  const parentDir = getParentPath(relativePath);

  await ensureDirectoryChain(parentDir);
  await applyAggregateDelta(parentDir, {
    size: file.size - (previousSize ?? 0),
    fileCount: previousSize === undefined ? 1 : 0,
    folderCount: 0,
  });

  invalidateLocalHashIndex();
};
