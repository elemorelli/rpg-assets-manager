import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";
import type { RenamePair } from "#utils/diff.ts";

export const recordAssetRenames = async (trx: Kysely<DB>, renamed: RenamePair[]): Promise<void> => {
  for (const pair of renamed) {
    await trx
      .insertInto("asset_renames")
      .values({ old_path: pair.oldPath, new_path: pair.newPath })
      .execute();
  }

  // Once the rename is recorded, a leftover pre-conversion previous_hash has served its matching purpose.
  for (const pair of renamed) {
    await trx
      .updateTable("assets")
      .set({ previous_hash: null })
      .where("path", "=", pair.newPath)
      .execute();
  }
};
