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
}

export const useDirectoryListing = (currentPath: string): UseDirectoryListingResult => {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const runAction = (action: () => Promise<void>): void => {
    setBusy(true);
    setError(null);

    action()
      .then(() => loadDirectory(currentPath))
      .catch((caught: unknown) => {
        setError(describeError(caught));
        setBusy(false);
      });
  };

  return { entries, busy, error, setBusy, setError, loadDirectory, runAction };
};
