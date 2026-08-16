import { type JSX, useEffect, useState } from "react";

import { ContextMenu } from "#components/context-menu/context-menu.tsx";
import { TagEditor } from "#components/tag-editor/tag-editor.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";

import styles from "./entry-context-menu.module.css";

export interface EntryContextMenuProps {
  entry: DirectoryEntry;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onRenameRequested: () => void;
  onDelete: (entry: DirectoryEntry) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
}

export const EntryContextMenu = ({
  entry,
  position,
  onClose,
  onRenameRequested,
  onDelete,
  availableTags,
  onTagsChange,
}: EntryContextMenuProps): JSX.Element => {
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);

  useEffect(() => {
    if (!position) {
      setConfirmingDelete(false);
    }
  }, [position]);

  const handleRename = (): void => {
    onRenameRequested();
    onClose();
  };

  const handleConfirmDelete = (): void => {
    onDelete(entry);
    onClose();
  };

  return (
    <ContextMenu position={position} onClose={onClose}>
      {confirmingDelete ? (
        <div className={styles.confirmDelete}>
          <p className={styles.confirmMessage}>Delete "{entry.name}"?</p>
          <button type="button" className={styles.item} onClick={handleConfirmDelete}>
            Confirm
          </button>
          <button type="button" className={styles.item} onClick={() => setConfirmingDelete(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className={styles.items}>
          <button type="button" className={styles.item} onClick={handleRename}>
            Rename
          </button>
          <button type="button" className={styles.item} onClick={() => setConfirmingDelete(true)}>
            Delete
          </button>
          {entry.type === "file" && (
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
      )}
    </ContextMenu>
  );
};
