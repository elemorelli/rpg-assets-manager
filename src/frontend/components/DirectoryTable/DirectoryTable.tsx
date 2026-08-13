import type { JSX } from "react";
import type { DirectoryEntry } from "../../../core/directoryListing.ts";
import { formatFileSize } from "../../../core/formatFileSize.ts";
import styles from "./DirectoryTable.module.css";

export interface DirectoryTableProps {
  entries: DirectoryEntry[];
  onOpenDirectory: (name: string) => void;
  onRename: (entry: DirectoryEntry) => void;
  onDelete: (entry: DirectoryEntry) => void;
  onMove: (entry: DirectoryEntry) => void;
}

export const DirectoryTable = ({
  entries,
  onOpenDirectory,
  onRename,
  onDelete,
  onMove,
}: DirectoryTableProps): JSX.Element => {
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

          return (
            <tr key={entry.name}>
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
