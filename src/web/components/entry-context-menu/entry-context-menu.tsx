import {
  faCopy,
  faEye,
  faPen,
  faTrash,
  faUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type JSX, useState } from "react";

import { ConfirmDialog } from "#components/confirm-dialog/confirm-dialog.tsx";
import { ContextMenu } from "#components/context-menu/context-menu.tsx";
import { MenuItem } from "#components/context-menu/menu-item.tsx";
import { MenuList } from "#components/context-menu/menu-list.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { isPreviewableEntry } from "#utils/preview.ts";
import { usePublicAssetLink } from "#web/utils/use-public-asset-link.ts";

import { DownloadMenuItems } from "./download-menu-items.tsx";
import { EntryTagsSection } from "./entry-tags-section.tsx";

export interface EntryContextMenuProps {
  entry: DirectoryEntry;
  relativePath: string;
  selectedEntries: DirectoryEntry[];
  position: { x: number; y: number } | null;
  onClose: () => void;
  onView?: (entry: DirectoryEntry) => void;
  onRenameRequested: () => void;
  onDelete: (entry: DirectoryEntry) => void;
  onDeleteMany?: (entries: DirectoryEntry[]) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
  onAddTagToMany?: (entries: DirectoryEntry[], tag: string) => void;
}

export const EntryContextMenu = ({
  entry,
  relativePath,
  selectedEntries,
  position,
  onClose,
  onView = () => {},
  onRenameRequested,
  onDelete,
  onDeleteMany = () => {},
  availableTags,
  onTagsChange,
  onAddTagToMany = () => {},
}: EntryContextMenuProps): JSX.Element => {
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const { publicAssetUrl, handleCopyLink } = usePublicAssetLink(relativePath);

  const isMultiSelection = selectedEntries.length > 1;
  const isPreviewable = !isMultiSelection && isPreviewableEntry(entry);
  const showLinkActions = !isMultiSelection && entry.type === "file" && publicAssetUrl !== null;

  const handleView = (): void => {
    onView(entry);
    onClose();
  };

  const handleRename = (): void => {
    onRenameRequested();
    onClose();
  };

  const handleOpenInNewTab = (): void => {
    if (publicAssetUrl) {
      window.open(publicAssetUrl, "_blank", "noopener,noreferrer");
    }

    onClose();
  };

  const handleCopyUrl = (): void => {
    handleCopyLink();
    onClose();
  };

  const handleDeleteRequested = (): void => {
    onClose();
    setConfirmingDelete(true);
  };

  const handleConfirmDelete = (): void => {
    if (isMultiSelection) {
      onDeleteMany(selectedEntries);
    } else {
      onDelete(entry);
    }

    setConfirmingDelete(false);
  };

  return (
    <>
      <ContextMenu position={position} onClose={onClose}>
        <MenuList>
          {isPreviewable && (
            <MenuItem onClick={handleView}>
              <FontAwesomeIcon icon={faEye} fixedWidth />
              View
            </MenuItem>
          )}
          {!isMultiSelection && (
            <MenuItem onClick={handleRename}>
              <FontAwesomeIcon icon={faPen} fixedWidth />
              Rename
            </MenuItem>
          )}
          {showLinkActions && (
            <>
              <MenuItem onClick={handleOpenInNewTab}>
                <FontAwesomeIcon icon={faUpRightFromSquare} fixedWidth />
                Open in new tab
              </MenuItem>
              <MenuItem onClick={handleCopyUrl}>
                <FontAwesomeIcon icon={faCopy} fixedWidth />
                Copy URL
              </MenuItem>
            </>
          )}
          <DownloadMenuItems
            relativePath={relativePath}
            selectedEntries={selectedEntries}
            onClose={onClose}
          />
          <MenuItem onClick={handleDeleteRequested}>
            <FontAwesomeIcon icon={faTrash} fixedWidth />
            {isMultiSelection ? `Delete ${selectedEntries.length} items` : "Delete"}
          </MenuItem>
          <EntryTagsSection
            entry={entry}
            selectedEntries={selectedEntries}
            availableTags={availableTags}
            onTagsChange={onTagsChange}
            onAddTagToMany={onAddTagToMany}
          />
        </MenuList>
      </ContextMenu>
      {confirmingDelete && (
        <ConfirmDialog
          title={isMultiSelection ? "Delete files" : "Delete file"}
          icon={faTrash}
          message={
            isMultiSelection ? `Delete ${selectedEntries.length} items?` : `Delete "${entry.name}"?`
          }
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
};
