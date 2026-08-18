import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";

import type { BatchDiffResult } from "../diff/index.ts";
import { planRemoteAssetChanges } from "./plan-remote-asset-changes.ts";

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
