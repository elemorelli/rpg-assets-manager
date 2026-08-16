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
import { resolvePreviewSource } from "#utils/preview.ts";
import { modifierFromClick, type SelectionClickModifier } from "#web/utils/row-selection.ts";
import { useContextMenu } from "#web/utils/use-context-menu.ts";

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
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameDraft, setRenameDraft] = useState<string>(entry.name);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const contextMenu = useContextMenu();

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

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
    if (event.target instanceof HTMLElement && event.target.closest("button, input")) {
      return;
    }

    if (entry.type !== "file" || resolvePreviewSource(entry).kind === "none") {
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
    <div
      draggable
      data-testid={`tile-${entry.name}`}
      aria-selected={isSelected}
      className={clsx(
        styles.tile,
        isDropTarget && dragOver && styles.dragOver,
        isSelected && styles.selected,
      )}
      onClick={handleTileClick}
      onDoubleClick={handleTileDoubleClick}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={contextMenu.open}>
      <AssetPreview
        entry={entry}
        relativePath={joinRelativePath(currentPath, entry.name)}
        size="large"
        onOpen={onOpenLightbox}
      />
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
        <button type="button" className={styles.nameButton} onClick={handleNameClick}>
          {entry.name}
        </button>
      ) : (
        <span className={styles.name}>{entry.name}</span>
      )}
      {entry.type === "file" && <TagBadgeList tags={entry.tags ?? []} />}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={`Actions for ${entry.name}`}
          onClick={handleMenuButtonClick}>
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </button>
      </div>
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
    </div>
  );
};
