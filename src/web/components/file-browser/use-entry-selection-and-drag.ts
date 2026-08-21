import { useEffect, useState } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import { isValidDropTarget } from "#web/utils/drag-drop.ts";
import {
  applySelectionClick,
  initialSelectionState,
  type SelectionClickModifier,
  type SelectionState,
  selectAll,
} from "#web/utils/row-selection.ts";

import { useBatchMove } from "./use-batch-move.ts";

const TYPING_TARGET_TAG_NAMES = new Set(["INPUT", "TEXTAREA"]);

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (TYPING_TARGET_TAG_NAMES.has(target.tagName) || target.isContentEditable);

const isSelectAllShortcut = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a";

export interface UseEntrySelectionAndDragParams {
  entries: DirectoryEntry[];
  sortedEntries: DirectoryEntry[];
  currentPath: string;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  refreshDirectory: (path: string) => Promise<void>;
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
  moveConflictingFileNames: string[] | null;
  confirmMoveOverwrite: () => void;
  cancelMoveOverwrite: () => void;
}

export const useEntrySelectionAndDrag = ({
  entries,
  sortedEntries,
  currentPath,
  setBusy,
  setError,
  refreshDirectory,
}: UseEntrySelectionAndDragParams): UseEntrySelectionAndDragResult => {
  const [selection, setSelection] = useState<SelectionState>(initialSelectionState);
  const [draggedEntries, setDraggedEntries] = useState<DirectoryEntry[]>([]);
  const { runBatchMove, moveConflictingFileNames, confirmMoveOverwrite, cancelMoveOverwrite } =
    useBatchMove({ currentPath, setBusy, setError, refreshDirectory });

  const handleSelectRow = (entry: DirectoryEntry, modifier: SelectionClickModifier): void => {
    const orderedNames = sortedEntries.map((candidate) => candidate.name);

    setSelection((prev) => applySelectionClick(prev, orderedNames, entry.name, modifier));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target) || !isSelectAllShortcut(event)) {
        return;
      }

      event.preventDefault();

      const orderedNames = sortedEntries.map((candidate) => candidate.name);

      setSelection(selectAll(orderedNames));
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sortedEntries]);

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

  const handleDropOnDirectory = (targetDirectoryPath: string): void => {
    if (!canDropOnDirectory(targetDirectoryPath)) {
      setDraggedEntries([]);

      return;
    }

    const entriesToMove = draggedEntries;

    setDraggedEntries([]);

    void runBatchMove(entriesToMove, targetDirectoryPath).then((succeeded) => {
      if (succeeded) {
        setSelection(initialSelectionState);
      }
    });
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
    moveConflictingFileNames,
    confirmMoveOverwrite,
    cancelMoveOverwrite,
  };
};
