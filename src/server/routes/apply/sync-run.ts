import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";

import type { BatchDiffResult } from "../diff/index.ts";
import {
  buildFinishSyncRunUpdate,
  type SyncRunWorldAcknowledgements,
} from "./build-finish-sync-run-update.ts";

export type SyncRunOutcome = "in_progress" | "applied" | "dry_run" | "failed";

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
  outcome: Exclude<SyncRunOutcome, "in_progress" | "failed">,
  diff: BatchDiffResult,
  purgeUrls: string[],
  generatedMacro: string | null,
  worldAcknowledgements: SyncRunWorldAcknowledgements,
): Promise<void> => {
  const update = buildFinishSyncRunUpdate(
    outcome,
    diff,
    purgeUrls,
    generatedMacro,
    worldAcknowledgements,
    new Date(),
  );

  await db.updateTable("sync_runs").set(update).where("id", "=", String(syncRunId)).execute();
};

export const failSyncRun = async (db: Kysely<DB>, syncRunId: number): Promise<void> => {
  await db
    .updateTable("sync_runs")
    .set({ finished_at: new Date(), outcome: "failed" })
    .where("id", "=", String(syncRunId))
    .execute();
};
