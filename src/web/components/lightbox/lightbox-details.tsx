import { type ChangeEvent, type JSX, type KeyboardEvent, useEffect, useRef, useState } from "react";

import { ConfirmDelete } from "#components/confirm-delete/confirm-delete.tsx";
import { TagEditor } from "#components/tag-editor/tag-editor.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { formatFileSize } from "#web/utils/format-file-size.ts";

import styles from "./lightbox-details.module.css";

export interface LightboxDetailsProps {
  entry: DirectoryEntry;
  onRename: (entry: DirectoryEntry, newName: string) => void;
  onDelete: (entry: DirectoryEntry) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
}

export const LightboxDetails = ({
  entry,
  onRename,
  onDelete,
  availableTags,
  onTagsChange,
}: LightboxDetailsProps): JSX.Element => {
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameDraft, setRenameDraft] = useState<string>(entry.name);
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const startRenaming = (): void => {
    setRenameDraft(entry.name);
    setIsRenaming(true);
  };

  const commitRename = (): void => {
    const trimmed = renameDraft.trim();

    if (trimmed && trimmed !== entry.name) {
      onRename(entry, trimmed);
    }

    setIsRenaming(false);
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsRenaming(false);
    }
  };

  const handleRenameDraftChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setRenameDraft(event.target.value);
  };

  const handleConfirmDelete = (): void => {
    onDelete(entry);
    setConfirmingDelete(false);
  };

  return (
    <div className={styles.details}>
      <div className={styles.nameRow}>
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            className={styles.renameInput}
            aria-label={`Rename ${entry.name}`}
            value={renameDraft}
            onChange={handleRenameDraftChange}
            onKeyDown={handleRenameKeyDown}
            onBlur={commitRename}
          />
        ) : (
          <>
            <span className={styles.name}>{entry.name}</span>
            <button type="button" className={styles.actionButton} onClick={startRenaming}>
              Rename
            </button>
          </>
        )}
      </div>
      <dl className={styles.fields}>
        <dt>Type</dt>
        <dd>{entry.type}</dd>
        {entry.size !== undefined && (
          <>
            <dt>Size</dt>
            <dd>{formatFileSize(entry.size)}</dd>
          </>
        )}
        {entry.mtimeMs !== undefined && (
          <>
            <dt>Modified</dt>
            <dd>{new Date(entry.mtimeMs).toLocaleString()}</dd>
          </>
        )}
      </dl>
      <TagEditor
        entryKey={entry.name}
        tags={entry.tags ?? []}
        availableTags={availableTags}
        onChange={(tags) => onTagsChange(entry, tags)}
      />
      {confirmingDelete ? (
        <ConfirmDelete
          entryName={entry.name}
          containerClassName={styles.confirmDelete}
          messageClassName={styles.confirmMessage}
          buttonClassName={styles.actionButton}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : (
        <button
          type="button"
          className={styles.deleteButton}
          onClick={() => setConfirmingDelete(true)}>
          Delete
        </button>
      )}
    </div>
  );
};
