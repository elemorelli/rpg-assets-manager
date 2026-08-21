import { useCallback, useEffect, useState } from "react";

import * as api from "#web/requests/index.ts";

export interface UseSyncPendingStatusResult {
  hasPendingSyncChanges: boolean;
  refreshSyncPendingStatus: () => Promise<void>;
}

export const useSyncPendingStatus = (refreshToken: number): UseSyncPendingStatusResult => {
  const [hasPendingSyncChanges, setHasPendingSyncChanges] = useState<boolean>(false);

  const refreshSyncPendingStatus = useCallback(async (): Promise<void> => {
    const diff = await api.fetchDiff();

    const hasChanges =
      diff.added.length > 0 ||
      diff.modified.length > 0 ||
      diff.deleted.length > 0 ||
      diff.renamed.length > 0;

    setHasPendingSyncChanges(hasChanges);
  }, []);

  useEffect(() => {
    refreshSyncPendingStatus();
  }, [refreshSyncPendingStatus, refreshToken]);

  return { hasPendingSyncChanges, refreshSyncPendingStatus };
};
