import { type DragEvent, type JSX, useState } from "react";

import { AssetPreview } from "#components/asset-preview/asset-preview.tsx";
import { TagEditor } from "#components/tag-editor/tag-editor.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import { formatFileSize } from "#web/utils/format-file-size.ts";

import styles from "./directory-table.module.css";

export interface DirectoryTableProps {
  entries: DirectoryEntry[];
  currentPath: string;
  onOpenDirectory: (name: string) => void;
  onRename: (entry: DirectoryEntry) => void;
  onDelete: (entry: DirectoryEntry) => void;
  onMove: (entry: DirectoryEntry) => void;
  onDragStart: (entry: DirectoryEntry) => void;
  onDragEnd: () => void;
  canDropEntry: (entry: DirectoryEntry) => boolean;
  onDropEntry: (entry: DirectoryEntry) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
}

export const DirectoryTable = ({
  entries,
  currentPath,
  onOpenDirectory,
  onRename,
  onDelete,
  onMove,
  onDragStart,
  onDragEnd,
  canDropEntry,
  onDropEntry,
  availableTags,
  onTagsChange,
}: DirectoryTableProps): JSX.Element => {
  const [dragOverName, setDragOverName] = useState<string | null>(null);

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Preview</th>
          <th>Name</th>
          <th>Type</th>
          <th>Size</th>
          <th>Tags</th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const sizeLabel =
            entry.type === "file" && entry.size !== undefined ? formatFileSize(entry.size) : "";
          const isDropTarget = canDropEntry(entry);
          const isDragOver = isDropTarget && dragOverName === entry.name;

          const handleDragOver = (event: DragEvent<HTMLTableRowElement>): void => {
            if (!isDropTarget) {
              return;
            }

            event.preventDefault();
            setDragOverName(entry.name);
          };

          const handleDragLeave = (): void => {
            setDragOverName((current) => (current === entry.name ? null : current));
          };

          const handleDrop = (event: DragEvent<HTMLTableRowElement>): void => {
            if (!isDropTarget) {
              return;
            }

            event.preventDefault();
            setDragOverName(null);
            onDropEntry(entry);
          };

          const handleDragStart = (event: DragEvent<HTMLTableRowElement>): void => {
            event.dataTransfer?.setData("text/plain", entry.name);
            onDragStart(entry);
          };

          return (
            <tr
              key={entry.name}
              draggable
              className={isDragOver ? styles.dragOver : undefined}
              onDragStart={handleDragStart}
              onDragEnd={onDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}>
              <td>
                <AssetPreview
                  entry={entry}
                  relativePath={joinRelativePath(currentPath, entry.name)}
                />
              </td>
              <td>
                {entry.type === "directory" ? (
                  <button
                    type="button"
                    className={styles.nameButton}
                    onClick={() => onOpenDirectory(entry.name)}>
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
        })}
      </tbody>
    </table>
  );
};
