import type { Kysely, Selectable } from "kysely";

import type { DB } from "#server/db/index.ts";

import type { BatchDiffResult } from "../diff/index.ts";

type AssetLookup = Pick<Selectable<DB["assets"]>, "size" | "hash">;
type AssetSize = AssetLookup["size"];

export type RemoteAssetOperation =
  | { type: "upsert"; path: string; size: AssetSize; hash: string }
  | { type: "delete"; path: string }
  | { type: "rename"; oldPath: string; newPath: string; size: AssetSize; hash: string };

const lookupAssetOrThrow = (assetsByPath: Map<string, AssetLookup>, path: string): AssetLookup => {
  const asset = assetsByPath.get(path);

  if (!asset) {
    throw new Error(`planRemoteAssetChanges: no asset row found for path "${path}"`);
  }

  return asset;
};

export const planRemoteAssetChanges = (
  diff: BatchDiffResult,
  assetsByPath: Map<string, AssetLookup>,
): RemoteAssetOperation[] => {
  const operations: RemoteAssetOperation[] = [];

  for (const path of [...diff.added, ...diff.modified]) {
    const asset = lookupAssetOrThrow(assetsByPath, path);

    operations.push({ type: "upsert", path, size: asset.size, hash: asset.hash });
  }

  for (const path of diff.deleted) {
    operations.push({ type: "delete", path });
  }

  for (const pair of diff.renamed) {
    const asset = lookupAssetOrThrow(assetsByPath, pair.newPath);

    operations.push({
      type: "rename",
      oldPath: pair.oldPath,
      newPath: pair.newPath,
      size: asset.size,
      hash: asset.hash,
    });
  }

  return operations;
};

export const mirrorRemoteAssets = async (trx: Kysely<DB>, diff: BatchDiffResult): Promise<void> => {
  const pathsNeedingAssetLookup = [
    ...diff.added,
    ...diff.modified,
    ...diff.renamed.map((pair) => pair.newPath),
  ];

  const assetRows =
    pathsNeedingAssetLookup.length === 0
      ? []
      : await trx
          .selectFrom("assets")
          .select(["path", "size", "hash"])
          .where("path", "in", pathsNeedingAssetLookup)
          .execute();

  const assetsByPath = new Map(
    assetRows.map((row) => [row.path, { size: row.size, hash: row.hash }]),
  );

  const operations = planRemoteAssetChanges(diff, assetsByPath);

  for (const operation of operations) {
    if (operation.type === "upsert") {
      await trx
        .insertInto("remote_assets")
        .values({ path: operation.path, size: operation.size, hash: operation.hash })
        .onConflict((column) =>
          column
            .column("path")
            .doUpdateSet({ size: operation.size, hash: operation.hash, synced_at: new Date() }),
        )
        .execute();

      continue;
    }

    if (operation.type === "delete") {
      await trx.deleteFrom("remote_assets").where("path", "=", operation.path).execute();

      continue;
    }

    await trx
      .updateTable("remote_assets")
      .set({
        path: operation.newPath,
        size: operation.size,
        hash: operation.hash,
        synced_at: new Date(),
      })
      .where("path", "=", operation.oldPath)
      .execute();
  }
};
