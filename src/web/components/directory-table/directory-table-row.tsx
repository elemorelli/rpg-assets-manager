import clsx from "clsx";
import { type DragEvent, type JSX, type MouseEvent, useState } from "react";

import { AssetPreview } from "#components/asset-preview/asset-preview.tsx";
import { TagEditor } from "#components/tag-editor/tag-editor.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import { formatFileSize } from "#web/utils/format-file-size.ts";
import { modifierFromClick, type SelectionClickModifier } from "#web/utils/row-selection.ts";

import styles from "./directory-table.module.css";

export interface DirectoryTableRowProps {
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

export const DirectoryTableRow = ({
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
}: DirectoryTableRowProps): JSX.Element => {
  const [dragOver, setDragOver] = useState<boolean>(false);
  const sizeLabel =
    entry.type === "file" && entry.size !== undefined ? formatFileSize(entry.size) : "";

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

  const handleNameClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onOpenDirectory(entry.name);
  };

  return (
    <tr
      draggable
      aria-selected={isSelected}
      className={clsx(isDropTarget && dragOver && styles.dragOver, isSelected && styles.selected)}
      onClick={handleRowClick}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}>
      <td>
        <AssetPreview entry={entry} relativePath={joinRelativePath(currentPath, entry.name)} />
      </td>
      <td>
        {entry.type === "directory" ? (
          <button type="button" className={styles.nameButton} onClick={handleNameClick}>
            {entry.name}
          </button>
        ) : (
          entry.name
        )}
      </td>
      <td>{entry.type}</td>
      <td>{sizeLabel}</td>
      <td>
        {entry.type === "file" && (
          <TagEditor
            entryKey={joinRelativePath(currentPath, entry.name)}
            tags={entry.tags ?? []}
            availableTags={availableTags}
            onChange={(tags) => onTagsChange(entry, tags)}
          />
        )}
      </td>
      <td className={styles.actions}>
        <button type="button" onClick={() => onRename(entry)}>
          Rename
        </button>
        <button type="button" onClick={() => onMove(entry)}>
          Move
        </button>
        <button type="button" onClick={() => onDelete(entry)}>
          Delete
        </button>
      </td>
    </tr>
  );
};
