import clsx from "clsx";
import { type DragEvent, type JSX, type MouseEvent, useState } from "react";

import { AssetPreview } from "#components/asset-preview/asset-preview.tsx";
import { TagEditor } from "#components/tag-editor/tag-editor.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import { modifierFromClick, type SelectionClickModifier } from "#web/utils/row-selection.ts";

import styles from "./directory-grid.module.css";

export interface DirectoryGridTileProps {
  entry: DirectoryEntry;
  currentPath: string;
  isSelected: boolean;
  isDropTarget: boolean;
  onOpenDirectory: (name: string) => void;
  onRename: (entry: DirectoryEntry) => void;
  onDelete: (entry: DirectoryEntry) => void;
  onMove: (entry: DirectoryEntry) => void;
  onDragStart: (entry: DirectoryEntry) => void;
  onDragEnd: () => void;
  onDropEntry: (entry: DirectoryEntry) => void;
  onSelectRow: (entry: DirectoryEntry, modifier: SelectionClickModifier) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
}

export const DirectoryGridTile = ({
  entry,
  currentPath,
  isSelected,
  isDropTarget,
  onOpenDirectory,
  onRename,
  onDelete,
  onMove,
  onDragStart,
  onDragEnd,
  onDropEntry,
  onSelectRow,
  availableTags,
  onTagsChange,
}: DirectoryGridTileProps): JSX.Element => {
  const [dragOver, setDragOver] = useState<boolean>(false);

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

  const handleNameClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onOpenDirectory(entry.name);
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
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}>
      <AssetPreview
        entry={entry}
        relativePath={joinRelativePath(currentPath, entry.name)}
        size="large"
      />
      {entry.type === "directory" ? (
        <button type="button" className={styles.nameButton} onClick={handleNameClick}>
          {entry.name}
        </button>
      ) : (
        <span className={styles.name}>{entry.name}</span>
      )}
      {entry.type === "file" && (
        <TagEditor
          entryKey={joinRelativePath(currentPath, entry.name)}
          tags={entry.tags ?? []}
          availableTags={availableTags}
          onChange={(tags) => onTagsChange(entry, tags)}
        />
      )}
      <div className={styles.actions}>
        <button type="button" onClick={() => onRename(entry)}>
          Rename
        </button>
        <button type="button" onClick={() => onMove(entry)}>
          Move
        </button>
        <button type="button" onClick={() => onDelete(entry)}>
          Delete
        </button>
      </div>
    </div>
  );
};
