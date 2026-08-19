import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type JSX, useState } from "react";

import { ConfirmDelete } from "#components/confirm-delete/confirm-delete.tsx";
import { TagEditor } from "#components/tag-editor/tag-editor.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { formatFileSize } from "#web/utils/format-file-size.ts";
import { useInlineRename } from "#web/utils/use-inline-rename.ts";

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
  const {
    isRenaming,
    renameDraft,
    renameInputRef,
    startRenaming,
    commitRename,
    handleRenameKeyDown,
    handleRenameDraftChange,
  } = useInlineRename(entry.name, (newName) => onRename(entry, newName));
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);

  const handleConfirmDelete = (): void => {
    onDelete(entry);
    setConfirmingDelete(false);
  };

  return (
    <div className={styles.details}>
      <div className={styles.header}>
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
            <button
              type="button"
              className={styles.renameIconButton}
              aria-label="Rename"
              onClick={startRenaming}>
              <FontAwesomeIcon icon={faPen} />
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

      <div className={styles.tagsSection}>
        <span className={styles.sectionLabel}>Tags</span>
        <TagEditor
          entryKey={entry.name}
          tags={entry.tags ?? []}
          availableTags={availableTags}
          onChange={(tags) => onTagsChange(entry, tags)}
        />
      </div>

      <div className={styles.dangerZone}>
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
            <FontAwesomeIcon icon={faTrash} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
