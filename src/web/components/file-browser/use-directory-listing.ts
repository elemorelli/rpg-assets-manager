import { useCallback, useEffect, useRef, useState } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import * as api from "#web/requests/index.ts";
import { describeErrorAsMessage, type Message } from "#web/utils/message.ts";

export interface UseDirectoryListingResult {
  entries: DirectoryEntry[];
  busy: boolean;
  message: Message | null;
  setBusy: (busy: boolean) => void;
  setMessage: (message: Message | null) => void;
  loadDirectory: (path: string) => Promise<void>;
  runAction: (action: () => Promise<void>) => void;
  treeRefreshTrigger: number;
  refreshAfterMutation: (path: string) => Promise<void>;
}

export const useDirectoryListing = (currentPath: string): UseDirectoryListingResult => {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [treeRefreshTrigger, setTreeRefreshTrigger] = useState<number>(0);

  const bumpTreeRefresh = useCallback((): void => {
    setTreeRefreshTrigger((trigger) => trigger + 1);
  }, []);

  const loadDirectory = useCallback(async (path: string): Promise<void> => {
    setBusy(true);
    setMessage(null);

    try {
      const listed = await api.listDirectory(path);

      setEntries(listed);
    } catch (error) {
      setMessage(describeErrorAsMessage(error));
    } finally {
      setBusy(false);
    }
  }, []);

  // Track the path our own navigation last loaded, distinct from same-path
  // refreshes triggered elsewhere (rename, upload, rescan...), which should
  // keep showing stale entries while they reload to avoid a skeleton flash.
  const lastNavigatedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastNavigatedPathRef.current !== currentPath) {
      // Entries belong to the previous path; combining them with the new
      // one produces broken preview URLs until the fresh listing arrives.
      setEntries([]);
    }

    lastNavigatedPathRef.current = currentPath;
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
    setMessage(null);

    action()
      .then(() => refreshAfterMutation(currentPath))
      .catch((error: unknown) => {
        setMessage(describeErrorAsMessage(error));
        setBusy(false);
      });
  };

  return {
    entries,
    busy,
    message,
    setBusy,
    setMessage,
    loadDirectory,
    runAction,
    treeRefreshTrigger,
    refreshAfterMutation,
  };
};
