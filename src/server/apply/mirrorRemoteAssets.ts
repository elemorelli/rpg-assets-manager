import type { Kysely } from "kysely";
import type { DB } from "../db/index.ts";
import type { BatchDiffResult } from "../diff/index.ts";

export const mirrorRemoteAssets = async (trx: Kysely<DB>, diff: BatchDiffResult): Promise<void> => {
  const toCopy = [...diff.added, ...diff.modified];

  for (const relativePath of toCopy) {
    const asset = await trx
      .selectFrom("assets")
      .select(["size", "hash"])
      .where("path", "=", relativePath)
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("remote_assets")
      .values({ path: relativePath, size: asset.size, hash: asset.hash })
      .onConflict((column) =>
        column
          .column("path")
          .doUpdateSet({ size: asset.size, hash: asset.hash, synced_at: new Date() }),
      )
      .execute();
  }

  for (const relativePath of diff.deleted) {
    await trx.deleteFrom("remote_assets").where("path", "=", relativePath).execute();
  }

  for (const pair of diff.renamed) {
    const asset = await trx
      .selectFrom("assets")
      .select(["size", "hash"])
      .where("path", "=", pair.newPath)
      .executeTakeFirstOrThrow();

    await trx
      .updateTable("remote_assets")
      .set({ path: pair.newPath, size: asset.size, hash: asset.hash, synced_at: new Date() })
      .where("path", "=", pair.oldPath)
      .execute();
  }
};
