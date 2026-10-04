import { db } from "#server/db/index.ts";
import { computeBatchDiff } from "#server/routes/diff/index.ts";

import { buildSyncStatus, type SyncStatus } from "./build-sync-status.ts";
import { createSyncStatusStore } from "./sync-status-store.ts";

export type { SyncStatus } from "./build-sync-status.ts";

const APPLIED_OUTCOME = "applied";

const fetchLastSyncAt = async (): Promise<Date | null> => {
  const lastSync = await db
    .selectFrom("sync_runs")
    .select((eb) => eb.fn.max("finished_at").as("finished_at"))
    .where("outcome", "=", APPLIED_OUTCOME)
    .executeTakeFirst();

  return lastSync?.finished_at ?? null;
};

const computeSyncStatus = async (): Promise<SyncStatus> => {
  const [diff, lastSyncAt] = await Promise.all([computeBatchDiff(), fetchLastSyncAt()]);

  return buildSyncStatus(diff, lastSyncAt);
};

const syncStatusStore = createSyncStatusStore(computeSyncStatus);

export const getSyncStatus = syncStatusStore.get;
export const startSyncStatusTracking = syncStatusStore.start;

// Fire-and-forget so a write never waits on the tree-wide diff.
export const refreshSyncStatus = (): void => {
  void syncStatusStore.refresh();
};
