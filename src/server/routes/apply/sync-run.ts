import { db } from "#server/db/index.ts";
import type { BatchDiff } from "#utils/diff.ts";

export type SyncRunOutcome = "in_progress" | "applied" | "dry_run" | "failed";

export const buildFinishSyncRunUpdate = (
  outcome: Exclude<SyncRunOutcome, "in_progress" | "failed">,
  diff: BatchDiff,
  purgeUrls: string[],
  finishedAt: Date,
) => ({
  finished_at: finishedAt,
  added_count: diff.added.length,
  modified_count: diff.modified.length,
  deleted_count: diff.deleted.length,
  renamed_count: diff.renamed.length,
  outcome,
  purged_urls: JSON.stringify(purgeUrls),
});

export const startSyncRun = async (): Promise<number> => {
  const syncRun = await db
    .insertInto("sync_runs")
    .values({ finished_at: null })
    .returning("id")
    .executeTakeFirstOrThrow();

  return Number(syncRun.id);
};

export const finishSyncRun = async (
  syncRunId: number,
  outcome: Exclude<SyncRunOutcome, "in_progress" | "failed">,
  diff: BatchDiff,
  purgeUrls: string[],
): Promise<void> => {
  const update = buildFinishSyncRunUpdate(outcome, diff, purgeUrls, new Date());

  await db.updateTable("sync_runs").set(update).where("id", "=", String(syncRunId)).execute();
};

export const failSyncRun = async (syncRunId: number): Promise<void> => {
  await db
    .updateTable("sync_runs")
    .set({ finished_at: new Date(), outcome: "failed" })
    .where("id", "=", String(syncRunId))
    .execute();
};
