import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { type JSX, useState } from "react";

import { ConfirmDialog } from "#components/confirm-dialog/confirm-dialog.tsx";
import { ContextMenu } from "#components/context-menu/context-menu.tsx";
import { TagEditor } from "#components/tag-editor/tag-editor.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { isPreviewableEntry } from "#utils/preview.ts";

import styles from "./entry-context-menu.module.css";

export interface EntryContextMenuProps {
  entry: DirectoryEntry;
  selectedEntries: DirectoryEntry[];
  position: { x: number; y: number } | null;
  onClose: () => void;
  onView: (entry: DirectoryEntry) => void;
  onRenameRequested: () => void;
  onDelete: (entry: DirectoryEntry) => void;
  onDeleteMany: (entries: DirectoryEntry[]) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
  onAddTagToMany: (entries: DirectoryEntry[], tag: string) => void;
}

export const EntryContextMenu = ({
  entry,
  selectedEntries,
  position,
  onClose,
  onView,
  onRenameRequested,
  onDelete,
  onDeleteMany,
  availableTags,
  onTagsChange,
  onAddTagToMany,
}: EntryContextMenuProps): JSX.Element => {
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);

  const isMultiSelection = selectedEntries.length > 1;
  const isPreviewable = !isMultiSelection && isPreviewableEntry(entry);
  const selectedFileEntries = selectedEntries.filter((candidate) => candidate.type === "file");

  const handleView = (): void => {
    onView(entry);
    onClose();
  };

  const handleRename = (): void => {
    onRenameRequested();
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
        <div className={styles.items}>
          {isPreviewable && (
            <button type="button" className={styles.item} onClick={handleView}>
              View
            </button>
          )}
          {!isMultiSelection && (
            <button type="button" className={styles.item} onClick={handleRename}>
              Rename
            </button>
          )}
          <button type="button" className={styles.item} onClick={handleDeleteRequested}>
            {isMultiSelection ? `Delete ${selectedEntries.length} items` : "Delete"}
          </button>
          {isMultiSelection
            ? selectedFileEntries.length > 0 && (
                <div className={styles.tagsSection}>
                  <TagEditor
                    entryKey={`batch-${entry.name}`}
                    tags={[]}
                    availableTags={availableTags}
                    onChange={(tags) => onAddTagToMany(selectedFileEntries, tags[0] ?? "")}
                  />
                </div>
              )
            : entry.type === "file" && (
                <div className={styles.tagsSection}>
                  <TagEditor
                    entryKey={entry.name}
                    tags={entry.tags ?? []}
                    availableTags={availableTags}
                    onChange={(tags) => onTagsChange(entry, tags)}
                  />
                </div>
              )}
        </div>
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
