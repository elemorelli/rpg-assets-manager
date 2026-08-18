import { useState } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import * as api from "#web/requests/index.ts";
import { isValidDropTarget } from "#web/utils/drag-drop.ts";
import {
  applySelectionClick,
  initialSelectionState,
  type SelectionClickModifier,
  type SelectionState,
} from "#web/utils/row-selection.ts";
import { runBatchOperation } from "#web/utils/run-batch-operation.ts";

export interface UseEntrySelectionAndDragParams {
  entries: DirectoryEntry[];
  sortedEntries: DirectoryEntry[];
  currentPath: string;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  loadDirectory: (path: string) => Promise<void>;
}

export interface UseEntrySelectionAndDragResult {
  selection: SelectionState;
  setSelection: (selection: SelectionState) => void;
  handleSelectRow: (entry: DirectoryEntry, modifier: SelectionClickModifier) => void;
  handleDragStart: (entry: DirectoryEntry) => void;
  handleDragEnd: () => void;
  canDropOnDirectory: (targetDirectoryPath: string) => boolean;
  canDropOnEntry: (targetEntry: DirectoryEntry) => boolean;
  handleDropOnDirectory: (targetDirectoryPath: string) => void;
  handleDropOnEntry: (targetEntry: DirectoryEntry) => void;
}

export const useEntrySelectionAndDrag = ({
  entries,
  sortedEntries,
  currentPath,
  setBusy,
  setError,
  loadDirectory,
}: UseEntrySelectionAndDragParams): UseEntrySelectionAndDragResult => {
  const [selection, setSelection] = useState<SelectionState>(initialSelectionState);
  const [draggedEntries, setDraggedEntries] = useState<DirectoryEntry[]>([]);

  const handleSelectRow = (entry: DirectoryEntry, modifier: SelectionClickModifier): void => {
    const orderedNames = sortedEntries.map((candidate) => candidate.name);

    setSelection((prev) => applySelectionClick(prev, orderedNames, entry.name, modifier));
  };

  const handleDragStart = (entry: DirectoryEntry): void => {
    const isPartOfSelection = selection.selectedNames.has(entry.name);
    const namesToDrag = isPartOfSelection ? selection.selectedNames : new Set([entry.name]);

    if (!isPartOfSelection) {
      setSelection({ selectedNames: namesToDrag, anchorName: entry.name });
    }

    setDraggedEntries(entries.filter((candidate) => namesToDrag.has(candidate.name)));
  };

  const handleDragEnd = (): void => {
    setDraggedEntries([]);
  };

  const canDropOnDirectory = (targetDirectoryPath: string): boolean => {
    if (draggedEntries.length === 0) {
      return false;
    }

    return draggedEntries.every((entry) =>
      isValidDropTarget(
        { relativePath: joinRelativePath(currentPath, entry.name), type: entry.type },
        targetDirectoryPath,
      ),
    );
  };

  const runBatchMove = (entriesToMove: DirectoryEntry[], targetDirectoryPath: string): void => {
    setBusy(true);
    setError(null);

    const performBatchMove = async (): Promise<void> => {
      const { errorMessage } = await runBatchOperation(
        entriesToMove,
        (entry) =>
          api.moveEntry(
            joinRelativePath(currentPath, entry.name),
            joinRelativePath(targetDirectoryPath, entry.name),
          ),
        (entry) => entry.name,
        "Moved",
      );

      // loadDirectory clears the error on entry, so refresh before surfacing errorMessage or the refresh wipes it.
      await loadDirectory(currentPath);

      if (errorMessage) {
        setError(errorMessage);
      } else {
        setSelection(initialSelectionState);
      }
    };

    void performBatchMove();
  };

  const handleDropOnDirectory = (targetDirectoryPath: string): void => {
    if (!canDropOnDirectory(targetDirectoryPath)) {
      setDraggedEntries([]);

      return;
    }

    const entriesToMove = draggedEntries;

    setDraggedEntries([]);
    runBatchMove(entriesToMove, targetDirectoryPath);
  };

  const canDropOnEntry = (targetEntry: DirectoryEntry): boolean =>
    targetEntry.type === "directory" &&
    canDropOnDirectory(joinRelativePath(currentPath, targetEntry.name));

  const handleDropOnEntry = (targetEntry: DirectoryEntry): void => {
    handleDropOnDirectory(joinRelativePath(currentPath, targetEntry.name));
  };

  return {
    selection,
    setSelection,
    handleSelectRow,
    handleDragStart,
    handleDragEnd,
    canDropOnDirectory,
    canDropOnEntry,
    handleDropOnDirectory,
    handleDropOnEntry,
  };
};
