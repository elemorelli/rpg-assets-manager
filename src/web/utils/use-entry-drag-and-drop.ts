import { type DragEvent, useState } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

export interface UseEntryDragAndDropParams {
  entry: DirectoryEntry;
  isDropTarget: boolean;
  onDragStart: (entry: DirectoryEntry) => void;
  onDropEntry: (entry: DirectoryEntry) => void;
}

export interface UseEntryDragAndDropResult<ElementType extends HTMLElement> {
  dragOver: boolean;
  handleDragOver: (event: DragEvent<ElementType>) => void;
  handleDragLeave: () => void;
  handleDrop: (event: DragEvent<ElementType>) => void;
  handleDragStart: (event: DragEvent<ElementType>) => void;
}

export const useEntryDragAndDrop = <ElementType extends HTMLElement>({
  entry,
  isDropTarget,
  onDragStart,
  onDropEntry,
}: UseEntryDragAndDropParams): UseEntryDragAndDropResult<ElementType> => {
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleDragOver = (event: DragEvent<ElementType>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (): void => {
    setDragOver(false);
  };

  const handleDrop = (event: DragEvent<ElementType>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();
    setDragOver(false);
    onDropEntry(entry);
  };

  const handleDragStart = (event: DragEvent<ElementType>): void => {
    event.dataTransfer?.setData("text/plain", entry.name);
    onDragStart(entry);
  };

  return { dragOver, handleDragOver, handleDragLeave, handleDrop, handleDragStart };
};
