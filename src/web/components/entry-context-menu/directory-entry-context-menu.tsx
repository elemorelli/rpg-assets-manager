import type { JSX } from "react";

import { joinRelativePath } from "#utils/paths.ts";
import type { DirectoryEntryItemProps } from "#web/utils/directory-entry-item-props.ts";
import type { UseContextMenuResult } from "#web/utils/use-context-menu.ts";

import { EntryContextMenu } from "./entry-context-menu.tsx";

export type DirectoryEntryContextMenuProps = Pick<
  DirectoryEntryItemProps,
  | "entry"
  | "currentPath"
  | "isSelected"
  | "selectedEntries"
  | "onDelete"
  | "onDeleteMany"
  | "availableTags"
  | "onTagsChange"
  | "onAddTagToMany"
  | "onOpenLightbox"
> & {
  contextMenu: UseContextMenuResult;
  onRenameRequested: () => void;
};

export const DirectoryEntryContextMenu = ({
  entry,
  currentPath,
  isSelected,
  selectedEntries,
  onDelete,
  onDeleteMany,
  availableTags,
  onTagsChange,
  onAddTagToMany,
  onOpenLightbox,
  contextMenu,
  onRenameRequested,
}: DirectoryEntryContextMenuProps): JSX.Element => {
  // Right-clicking one entry of a multi-selection acts on the whole selection.
  const isPartOfMultiSelection = isSelected && selectedEntries.length > 1;
  const entriesForContextMenu = isPartOfMultiSelection ? selectedEntries : [entry];

  return (
    <EntryContextMenu
      entry={entry}
      relativePath={joinRelativePath(currentPath, entry.name)}
      selectedEntries={entriesForContextMenu}
      position={contextMenu.position}
      onClose={contextMenu.close}
      onView={onOpenLightbox}
      onRenameRequested={onRenameRequested}
      onDelete={onDelete}
      onDeleteMany={onDeleteMany}
      availableTags={availableTags}
      onTagsChange={onTagsChange}
      onAddTagToMany={onAddTagToMany}
    />
  );
};
