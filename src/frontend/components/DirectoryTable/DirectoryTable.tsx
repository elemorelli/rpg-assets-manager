import { type DragEvent, type JSX, useState } from "react";
import type { DirectoryEntry } from "../../../core/directoryListing.ts";
import { formatFileSize } from "../../../core/formatFileSize.ts";
import styles from "./DirectoryTable.module.css";

export interface DirectoryTableProps {
  entries: DirectoryEntry[];
  onOpenDirectory: (name: string) => void;
  onRename: (entry: DirectoryEntry) => void;
  onDelete: (entry: DirectoryEntry) => void;
  onMove: (entry: DirectoryEntry) => void;
  onDragStart: (entry: DirectoryEntry) => void;
  onDragEnd: () => void;
  canDropEntry: (entry: DirectoryEntry) => boolean;
  onDropEntry: (entry: DirectoryEntry) => void;
}

export const DirectoryTable = ({
  entries,
  onOpenDirectory,
  onRename,
  onDelete,
  onMove,
  onDragStart,
  onDragEnd,
  canDropEntry,
  onDropEntry,
}: DirectoryTableProps): JSX.Element => {
  const [dragOverName, setDragOverName] = useState<string | null>(null);

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Size</th>
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
