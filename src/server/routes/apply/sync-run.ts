import type { Kysely } from "kysely";
import type { DB } from "#server/db/index.ts";
import type { BatchDiffResult } from "../diff/index.ts";

export const startSyncRun = async (db: Kysely<DB>): Promise<number> => {
  const syncRun = await db
    .insertInto("sync_runs")
    .values({ finished_at: null, generated_macro: null })
    .returning("id")
    .executeTakeFirstOrThrow();

  return Number(syncRun.id);
};

export const finishSyncRun = async (
  db: Kysely<DB>,
  syncRunId: number,
  outcome: "applied" | "dry_run",
  diff: BatchDiffResult,
  purgeUrls: string[],
): Promise<void> => {
  await db
    .updateTable("sync_runs")
    .set({
      finished_at: new Date(),
      added_count: diff.added.length,
      modified_count: diff.modified.length,
      deleted_count: diff.deleted.length,
      renamed_count: diff.renamed.length,
      outcome,
      purged_urls: JSON.stringify(purgeUrls),
    })
    .where("id", "=", String(syncRunId))
    .execute();
};

export const failSyncRun = async (db: Kysely<DB>, syncRunId: number): Promise<void> => {
  await db
    .updateTable("sync_runs")
    .set({ finished_at: new Date(), outcome: "failed" })
    .where("id", "=", String(syncRunId))
    .execute();
};
