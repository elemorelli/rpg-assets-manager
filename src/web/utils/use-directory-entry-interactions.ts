import type { MouseEvent } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { getEntrySyncFlags } from "#utils/directory-listing.ts";
import {
  createEntrySelectionHandlers,
  type EntrySelectionHandlers,
} from "#web/utils/entry-selection-handlers.ts";
import { formatFileSize } from "#web/utils/format-file-size.ts";
import type { SelectionClickModifier } from "#web/utils/row-selection.ts";
import { type UseContextMenuResult, useContextMenu } from "#web/utils/use-context-menu.ts";
import {
  type UseEntryDragAndDropResult,
  useEntryDragAndDrop,
} from "#web/utils/use-entry-drag-and-drop.ts";
import { type UseInlineRenameResult, useInlineRename } from "#web/utils/use-inline-rename.ts";

export interface UseDirectoryEntryInteractionsParams {
  entry: DirectoryEntry;
  isDropTarget: boolean;
  onOpenDirectory: (name: string) => void;
  onRename: (entry: DirectoryEntry, newName: string) => void;
  onDragStart: (entry: DirectoryEntry) => void;
  onDropEntry: (entry: DirectoryEntry) => void;
  onSelectRow: (entry: DirectoryEntry, modifier: SelectionClickModifier) => void;
  onOpenLightbox: (entry: DirectoryEntry) => void;
}

export interface UseDirectoryEntryInteractionsResult<ElementType extends HTMLElement>
  extends UseInlineRenameResult,
    UseEntryDragAndDropResult<ElementType>,
    EntrySelectionHandlers<ElementType> {
  isDeleted: boolean;
  isNew: boolean;
  isRenamed: boolean;
  isPending: boolean;
  contextMenu: UseContextMenuResult;
  sizeLabel: string;
  handleMenuButtonClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export const useDirectoryEntryInteractions = <ElementType extends HTMLElement>({
  entry,
  isDropTarget,
  onOpenDirectory,
  onRename,
  onDragStart,
  onDropEntry,
  onSelectRow,
  onOpenLightbox,
}: UseDirectoryEntryInteractionsParams): UseDirectoryEntryInteractionsResult<ElementType> => {
  const inlineRename = useInlineRename(entry.name, (newName) => onRename(entry, newName));
  const { isDeleted, isNew, isRenamed, isPending } = getEntrySyncFlags(entry);
  const dragAndDrop = useEntryDragAndDrop<ElementType>({
    entry,
    isDropTarget,
    onDragStart,
    onDropEntry,
  });
  const selectionHandlers = createEntrySelectionHandlers<ElementType>({
    entry,
    isDeleted,
    onSelectRow,
    onOpenDirectory,
    onOpenLightbox,
  });
  const contextMenu = useContextMenu();
  const sizeLabel = entry.size !== undefined ? formatFileSize(entry.size) : "";

  const handleMenuButtonClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    contextMenu.open(event);
  };

  return {
    ...inlineRename,
    isDeleted,
    isNew,
    isRenamed,
    isPending,
    ...dragAndDrop,
    ...selectionHandlers,
    contextMenu,
    sizeLabel,
    handleMenuButtonClick,
  };
};
