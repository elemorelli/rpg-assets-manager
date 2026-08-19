import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";
import type { SyncRunOutcome } from "#server/routes/apply/sync-run.ts";

export interface SyncRunSummary {
  id: number;
  startedAt: Date;
  finishedAt: Date | null;
  addedCount: number;
  modifiedCount: number;
  deletedCount: number;
  renamedCount: number;
  outcome: SyncRunOutcome;
}

export const listSyncRuns = async (db: Kysely<DB>): Promise<SyncRunSummary[]> => {
  const rows = await db.selectFrom("sync_runs").selectAll().orderBy("started_at", "desc").execute();

  return rows.map((row) => ({
    id: Number(row.id),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    addedCount: row.added_count,
    modifiedCount: row.modified_count,
    deletedCount: row.deleted_count,
    renamedCount: row.renamed_count,
    outcome: row.outcome as SyncRunOutcome,
  }));
};
