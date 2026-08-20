import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";
import { isConflictError } from "#web/utils/is-conflict-error.ts";

import { useOverwriteConfirmation } from "./use-overwrite-confirmation.ts";

interface MoveItem {
  fromPath: string;
  toPath: string;
  displayName: string;
}

export interface UseBatchMoveParams {
  currentPath: string;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  refreshDirectory: (path: string) => Promise<void>;
}

export interface UseBatchMoveResult {
  runBatchMove: (entriesToMove: DirectoryEntry[], targetDirectoryPath: string) => Promise<boolean>;
  moveConflictingFileNames: string[] | null;
  confirmMoveOverwrite: () => void;
  cancelMoveOverwrite: () => void;
}

export const useBatchMove = ({
  currentPath,
  setBusy,
  setError,
  refreshDirectory,
}: UseBatchMoveParams): UseBatchMoveResult => {
  const {
    conflictingFileNames: moveConflictingFileNames,
    askToOverwrite,
    confirmOverwrite: confirmMoveOverwrite,
    cancelOverwrite: cancelMoveOverwrite,
  } = useOverwriteConfirmation<MoveItem>();

  const moveBatch = async (items: MoveItem[]): Promise<boolean> => {
    let successCount = 0;
    const conflicts: MoveItem[] = [];
    let errorMessage: string | null = null;

    for (const item of items) {
      try {
        await api.moveEntry(item.fromPath, item.toPath);
        successCount += 1;
      } catch (caught) {
        if (isConflictError(caught)) {
          conflicts.push(item);
          continue;
        }

        errorMessage = `Moved ${successCount} of ${items.length} before failing on "${item.displayName}": ${describeError(caught)}`;
        break;
      }
    }

    if (errorMessage === null && conflicts.length > 0) {
      const overwriteConfirmed = await askToOverwrite(conflicts);

      if (overwriteConfirmed) {
        for (const item of conflicts) {
          try {
            await api.moveEntry(item.fromPath, item.toPath, true);
            successCount += 1;
          } catch (caught) {
            errorMessage = `Moved ${successCount} of ${items.length} before failing on "${item.displayName}": ${describeError(caught)}`;
            break;
          }
        }
      } else {
        const skippedNames = conflicts.map((item) => item.displayName).join(", ");

        errorMessage = `Skipped ${conflicts.length} item(s) that already exist at the destination: ${skippedNames}`;
      }
    }

    // refreshDirectory clears the error on entry, so refresh before surfacing errorMessage or the refresh wipes it.
    await refreshDirectory(currentPath);

    if (errorMessage) {
      setError(errorMessage);

      return false;
    }

    return true;
  };

  const runBatchMove = (
    entriesToMove: DirectoryEntry[],
    targetDirectoryPath: string,
  ): Promise<boolean> => {
    setBusy(true);
    setError(null);

    return moveBatch(
      entriesToMove.map((entry) => ({
        fromPath: joinRelativePath(currentPath, entry.name),
        toPath: joinRelativePath(targetDirectoryPath, entry.name),
        displayName: entry.name,
      })),
    );
  };

  return { runBatchMove, moveConflictingFileNames, confirmMoveOverwrite, cancelMoveOverwrite };
};
