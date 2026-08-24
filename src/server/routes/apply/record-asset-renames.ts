import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";

import type { RenamePair } from "../diff/index.ts";

export const recordAssetRenames = async (trx: Kysely<DB>, renamed: RenamePair[]): Promise<void> => {
  for (const pair of renamed) {
    await trx
      .insertInto("asset_renames")
      .values({ old_path: pair.oldPath, new_path: pair.newPath })
      .execute();
  }

  // A renamed row's new path may still carry a pre-conversion previous_hash;
  // once the rename is recorded it has served its purpose for matching.
  for (const pair of renamed) {
    await trx
      .updateTable("assets")
      .set({ previous_hash: null })
      .where("path", "=", pair.newPath)
      .execute();
  }
};
