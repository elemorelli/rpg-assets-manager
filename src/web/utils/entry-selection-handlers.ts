import type { MouseEvent } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { isPreviewableEntry } from "#utils/preview.ts";
import { modifierFromClick, type SelectionClickModifier } from "#web/utils/row-selection.ts";

export interface CreateEntrySelectionHandlersParams {
  entry: DirectoryEntry;
  isDeleted: boolean;
  onSelectRow: (entry: DirectoryEntry, modifier: SelectionClickModifier) => void;
  onOpenDirectory: (name: string) => void;
  onOpenLightbox: (entry: DirectoryEntry) => void;
}

export interface EntrySelectionHandlers<ElementType extends HTMLElement> {
  handleClick: (event: MouseEvent<ElementType>) => void;
  handleNameClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export const createEntrySelectionHandlers = <ElementType extends HTMLElement>({
  entry,
  isDeleted,
  onSelectRow,
  onOpenDirectory,
  onOpenLightbox,
}: CreateEntrySelectionHandlersParams): EntrySelectionHandlers<ElementType> => {
  const openEntry = (event: MouseEvent<ElementType>): void => {
    if (isDeleted) {
      return;
    }

    if (event.target instanceof HTMLElement && event.target.closest("button, input")) {
      return;
    }

    if (entry.type === "directory") {
      onOpenDirectory(entry.name);

      return;
    }

    if (!isPreviewableEntry(entry)) {
      return;
    }

    onOpenLightbox(entry);
  };

  const handleClick = (event: MouseEvent<ElementType>): void => {
    const modifier = modifierFromClick(event);

    onSelectRow(entry, modifier);

    if (modifier === "replace") {
      openEntry(event);
    }
  };

  const handleNameClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onOpenDirectory(entry.name);
  };

  return { handleClick, handleNameClick };
};
