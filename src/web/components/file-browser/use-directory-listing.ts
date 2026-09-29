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

  // Tracks our own last navigation, so same-path refreshes keep stale entries instead of flashing a skeleton.
  const lastNavigatedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastNavigatedPathRef.current !== currentPath) {
      // Entries from the previous path would build broken preview URLs until the new listing arrives.
      setEntries([]);
    }

    lastNavigatedPathRef.current = currentPath;
    loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  // The listing and the sidebar tree cache separately, so every mutation must refresh both.
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
