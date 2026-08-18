import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { type DragEvent, type JSX, type MouseEvent, useState } from "react";

import { AssetPreview } from "#components/asset-preview/asset-preview.tsx";
import { EntryContextMenu } from "#components/entry-context-menu/entry-context-menu.tsx";
import { TagBadgeList } from "#components/tag-badge-list/tag-badge-list.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import { isPreviewableEntry } from "#utils/preview.ts";
import { modifierFromClick, type SelectionClickModifier } from "#web/utils/row-selection.ts";
import { useContextMenu } from "#web/utils/use-context-menu.ts";
import { useInlineRename } from "#web/utils/use-inline-rename.ts";

import styles from "./directory-grid.module.css";

export interface DirectoryGridTileProps {
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

export const DirectoryGridTile = ({
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
}: DirectoryGridTileProps): JSX.Element => {
  const [dragOver, setDragOver] = useState<boolean>(false);
  const {
    isRenaming,
    renameDraft,
    renameInputRef,
    startRenaming,
    commitRename,
    handleRenameKeyDown,
    handleRenameDraftChange,
  } = useInlineRename(entry.name, (newName) => onRename(entry, newName));
  const contextMenu = useContextMenu();
  const isDeleted = entry.syncStatus === "deleted";
  const isNew = entry.syncStatus === "new";
  const isRenamed = entry.syncStatus === "renamed";
  const isPending = entry.syncStatus === "pending" || entry.hasPendingSync === true;

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (): void => {
    setDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();
    setDragOver(false);
    onDropEntry(entry);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>): void => {
    event.dataTransfer?.setData("text/plain", entry.name);
    onDragStart(entry);
  };

  const handleTileClick = (event: MouseEvent<HTMLDivElement>): void => {
    onSelectRow(entry, modifierFromClick(event));
  };

  const handleTileDoubleClick = (event: MouseEvent<HTMLDivElement>): void => {
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

  return (
    <div
      draggable={!isDeleted}
      data-testid={`tile-${entry.name}`}
      aria-selected={isSelected}
      className={clsx(
        styles.tile,
        isDropTarget && dragOver && styles.dragOver,
        isSelected && styles.selected,
      )}
      onClick={isDeleted ? undefined : handleTileClick}
      onDoubleClick={handleTileDoubleClick}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={isDeleted ? undefined : contextMenu.open}>
      <div className={styles.previewArea}>
        <AssetPreview
          entry={entry}
          relativePath={joinRelativePath(currentPath, entry.name)}
          size="large"
          onOpen={onOpenLightbox}
        />
        {!isDeleted && (
          <button
            type="button"
            className={styles.menuButtonOverlay}
            aria-label={`Actions for ${entry.name}`}
            onClick={handleMenuButtonClick}>
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </button>
        )}
      </div>
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
        <span
          className={clsx(
            styles.name,
            isPending && styles.pending,
            isNew && styles.new,
            isRenamed && styles.renamed,
            isDeleted && styles.deleted,
          )}>
          {entry.name}
        </span>
      )}
      {entry.type === "file" && <TagBadgeList tags={entry.tags ?? []} />}
      {!isDeleted && (
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
      )}
    </div>
  );
};
