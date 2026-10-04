import type { SyncStatus } from "./build-sync-status.ts";

export const EMPTY_SYNC_STATUS: SyncStatus = {
  added: 0,
  modified: 0,
  deleted: 0,
  renamed: 0,
  lastSyncAt: null,
};

export interface SyncStatusStore {
  get: () => SyncStatus;
  refresh: () => Promise<void>;
  start: () => Promise<void>;
}

export const createSyncStatusStore = (
  computeStatus: () => Promise<SyncStatus>,
): SyncStatusStore => {
  let currentStatus = EMPTY_SYNC_STATUS;
  let latestRefreshId = 0;
  let isTracking = false;

  const get = (): SyncStatus => currentStatus;

  const refresh = async (): Promise<void> => {
    if (!isTracking) {
      return;
    }

    latestRefreshId += 1;
    const refreshId = latestRefreshId;

    try {
      const status = await computeStatus();
      const isNewestRefresh = refreshId === latestRefreshId;

      if (isNewestRefresh) {
        currentStatus = status;
      }
    } catch (error) {
      console.error("sync status refresh failed", error);
    }
  };

  const start = async (): Promise<void> => {
    isTracking = true;

    await refresh();
  };

  return { get, refresh, start };
};
