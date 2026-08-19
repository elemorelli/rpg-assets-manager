import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";

import type { RenamePair } from "../diff/index.ts";

export const recordAssetRenames = async (db: Kysely<DB>, renamed: RenamePair[]): Promise<void> => {
  for (const pair of renamed) {
    await db
      .insertInto("asset_renames")
      .values({ old_path: pair.oldPath, new_path: pair.newPath })
      .execute();
  }
};
