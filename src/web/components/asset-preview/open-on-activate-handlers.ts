import type { KeyboardEvent, MouseEvent } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { modifierFromClick } from "#web/utils/row-selection.ts";

export interface CreateOpenOnActivateHandlersParams {
  entry: DirectoryEntry;
  onOpen: ((entry: DirectoryEntry) => void) | undefined;
}

export interface OpenOnActivateHandlers<ElementType extends HTMLElement> {
  handleOpenClick: (event: MouseEvent<ElementType>) => void;
  handleOpenKeyDown: (event: KeyboardEvent<ElementType>) => void;
}

export const createOpenOnActivateHandlers = <ElementType extends HTMLElement>({
  entry,
  onOpen,
}: CreateOpenOnActivateHandlersParams): OpenOnActivateHandlers<ElementType> => {
  const handleOpenClick = (event: MouseEvent<ElementType>): void => {
    if (modifierFromClick(event) !== "replace") {
      return;
    }

    onOpen?.(entry);
  };

  const handleOpenKeyDown = (event: KeyboardEvent<ElementType>): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.(entry);
    }
  };

  return { handleOpenClick, handleOpenKeyDown };
};
