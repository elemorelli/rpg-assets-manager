import { useCallback, useEffect, useState } from "react";

import * as api from "#web/requests/index.ts";

export interface UseFoundryPendingStatusResult {
  hasPendingFoundryMacro: boolean;
  refreshFoundryPendingStatus: () => Promise<void>;
}

export const useFoundryPendingStatus = (refreshToken: number): UseFoundryPendingStatusResult => {
  const [hasPendingFoundryMacro, setHasPendingFoundryMacro] = useState<boolean>(false);

  const refreshFoundryPendingStatus = useCallback(async (): Promise<void> => {
    const worlds = await api.fetchFoundryWorlds();

    setHasPendingFoundryMacro(worlds.some((world) => world.pendingMacro !== null));
  }, []);

  useEffect(() => {
    refreshFoundryPendingStatus();
  }, [refreshFoundryPendingStatus, refreshToken]);

  return { hasPendingFoundryMacro, refreshFoundryPendingStatus };
};
