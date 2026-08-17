import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import {
  type ChangeEvent,
  type DragEvent,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { AssetPreview } from "#components/asset-preview/asset-preview.tsx";
import { EntryContextMenu } from "#components/entry-context-menu/entry-context-menu.tsx";
import { TagBadgeList } from "#components/tag-badge-list/tag-badge-list.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import { isPreviewableEntry } from "#utils/preview.ts";
import { formatFileSize } from "#web/utils/format-file-size.ts";
import { modifierFromClick, type SelectionClickModifier } from "#web/utils/row-selection.ts";
import { useContextMenu } from "#web/utils/use-context-menu.ts";

import styles from "./directory-table.module.css";

export interface DirectoryTableRowProps {
  entry: DirectoryEntry;
  currentPath: string;
  isSelected: boolean;
  isDropTarget: boolean;
  onOpenDirectory: (name: string) => void;
  onRename: (entry: DirectoryEntry, newName: string) => void;
  onDelete: (entry: DirectoryEntry) => void;
  onDragStart: (entry: DirectoryEntry) => void;
  onDragEnd: () => void;
  onDropEntry: (entry: DirectoryEntry) => void;
  onSelectRow: (entry: DirectoryEntry, modifier: SelectionClickModifier) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
  onOpenLightbox: (entry: DirectoryEntry) => void;
}

export const DirectoryTableRow = ({
  entry,
  currentPath,
  isSelected,
  isDropTarget,
  onOpenDirectory,
  onRename,
  onDelete,
  onDragStart,
  onDragEnd,
  onDropEntry,
  onSelectRow,
  availableTags,
  onTagsChange,
  onOpenLightbox,
}: DirectoryTableRowProps): JSX.Element => {
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameDraft, setRenameDraft] = useState<string>(entry.name);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const contextMenu = useContextMenu();
  const sizeLabel =
    entry.type === "file" && entry.size !== undefined ? formatFileSize(entry.size) : "";
  const isDeleted = entry.syncStatus === "deleted";
  const isNew = entry.syncStatus === "new";
  const isRenamed = entry.syncStatus === "renamed";
  const isPending = entry.syncStatus === "pending" || entry.hasPendingSync === true;

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const handleDragOver = (event: DragEvent<HTMLTableRowElement>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (): void => {
    setDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLTableRowElement>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();
    setDragOver(false);
    onDropEntry(entry);
  };

  const handleDragStart = (event: DragEvent<HTMLTableRowElement>): void => {
    event.dataTransfer?.setData("text/plain", entry.name);
    onDragStart(entry);
  };

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>): void => {
    onSelectRow(entry, modifierFromClick(event));
  };

  const handleRowDoubleClick = (event: MouseEvent<HTMLTableRowElement>): void => {
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

  const handleNameClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onOpenDirectory(entry.name);
  };

  const handleMenuButtonClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    contextMenu.open(event);
  };

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

  return (
    <tr
      draggable={!isDeleted}
      aria-selected={isSelected}
      className={clsx(isDropTarget && dragOver && styles.dragOver, isSelected && styles.selected)}
      onClick={isDeleted ? undefined : handleRowClick}
      onDoubleClick={handleRowDoubleClick}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={isDeleted ? undefined : contextMenu.open}>
      <td className={styles.preview}>
        <span className={styles.previewCell}>
          <AssetPreview
            entry={entry}
            relativePath={joinRelativePath(currentPath, entry.name)}
            onOpen={onOpenLightbox}
          />
        </span>
      </td>
      <td>
        <span
          className={clsx(
            styles.nameCell,
            isPending && styles.pending,
            isNew && styles.new,
            isRenamed && styles.renamed,
            isDeleted && styles.deleted,
          )}>
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
          ) : entry.type === "directory" ? (
            <button
              type="button"
              className={clsx(styles.nameButton, isPending && styles.pending)}
              onClick={handleNameClick}>
              {entry.name}
            </button>
          ) : (
            entry.name
          )}
          {entry.type === "file" && entry.tags && entry.tags.length > 0 && (
            <TagBadgeList tags={entry.tags} />
          )}
        </span>
      </td>
      <td className={styles.shrink}>{entry.type}</td>
      <td className={styles.shrink}>{sizeLabel}</td>
      <td className={styles.actions}>
        {!isDeleted && (
          <>
            <button
              type="button"
              className={styles.menuButton}
              aria-label={`Actions for ${entry.name}`}
              onClick={handleMenuButtonClick}>
              <FontAwesomeIcon icon={faEllipsisVertical} />
            </button>
            <EntryContextMenu
              entry={entry}
              position={contextMenu.position}
              onClose={contextMenu.close}
              onView={onOpenLightbox}
              onRenameRequested={startRenaming}
              onDelete={onDelete}
              availableTags={availableTags}
              onTagsChange={onTagsChange}
            />
          </>
        )}
      </td>
    </tr>
  );
};
