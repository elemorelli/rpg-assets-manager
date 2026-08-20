import { useCallback, useEffect, useState } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";

export interface UseDirectoryListingResult {
  entries: DirectoryEntry[];
  busy: boolean;
  error: string | null;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  loadDirectory: (path: string) => Promise<void>;
  runAction: (action: () => Promise<void>) => void;
  treeRefreshTrigger: number;
  refreshAfterMutation: (path: string) => Promise<void>;
}

export const useDirectoryListing = (currentPath: string): UseDirectoryListingResult => {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [treeRefreshTrigger, setTreeRefreshTrigger] = useState<number>(0);

  const bumpTreeRefresh = useCallback((): void => {
    setTreeRefreshTrigger((trigger) => trigger + 1);
  }, []);

  const loadDirectory = useCallback(async (path: string): Promise<void> => {
    setBusy(true);
    setError(null);

    try {
      const listed = await api.listDirectory(path);

      setEntries(listed);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  // The table's own listing and the sidebar tree keep separate caches (see
  // use-tree-data.ts), so every mutation that can change what a directory
  // contains needs to refresh both, not just the one the user is looking at.
  const refreshAfterMutation = useCallback(
    async (path: string): Promise<void> => {
      await loadDirectory(path);
      bumpTreeRefresh();
    },
    [loadDirectory, bumpTreeRefresh],
  );

  const runAction = (action: () => Promise<void>): void => {
    setBusy(true);
    setError(null);

    action()
      .then(() => refreshAfterMutation(currentPath))
      .catch((caught: unknown) => {
        setError(describeError(caught));
        setBusy(false);
      });
  };

  return {
    entries,
    busy,
    error,
    setBusy,
    setError,
    loadDirectory,
    runAction,
    treeRefreshTrigger,
    refreshAfterMutation,
  };
};
