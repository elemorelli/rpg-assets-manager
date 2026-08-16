import { Fragment, type JSX } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import type { EntryGroup } from "#web/utils/entry-grouping.ts";
import type { SelectionClickModifier } from "#web/utils/row-selection.ts";

import styles from "./directory-table.module.css";
import { DirectoryTableRow } from "./directory-table-row.tsx";

export interface DirectoryTableProps {
  groups: EntryGroup[];
  currentPath: string;
  onOpenDirectory: (name: string) => void;
  onRename: (entry: DirectoryEntry, newName: string) => void;
  onDelete: (entry: DirectoryEntry) => void;
  onDragStart: (entry: DirectoryEntry) => void;
  onDragEnd: () => void;
  canDropEntry: (entry: DirectoryEntry) => boolean;
  onDropEntry: (entry: DirectoryEntry) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
  selectedNames: Set<string>;
  onSelectRow: (entry: DirectoryEntry, modifier: SelectionClickModifier) => void;
  onOpenLightbox: (entry: DirectoryEntry) => void;
}

const UNGROUPED_KEY = "__ungrouped__";

export const DirectoryTable = ({
  groups,
  currentPath,
  onOpenDirectory,
  onRename,
  onDelete,
  onDragStart,
  onDragEnd,
  canDropEntry,
  onDropEntry,
  availableTags,
  onTagsChange,
  selectedNames,
  onSelectRow,
  onOpenLightbox,
}: DirectoryTableProps): JSX.Element => (
  <table className={styles.table}>
    <thead>
      <tr>
        <th className={styles.preview}>Preview</th>
        <th>Name</th>
        <th>Type</th>
        <th>Size</th>
        <th>Tags</th>
        <th className={styles.actions} aria-label="Actions" />
      </tr>
    </thead>
    <tbody>
      {groups.map((group) => (
        <Fragment key={group.label ?? UNGROUPED_KEY}>
          {group.label !== null && (
            <tr className={styles.groupHeader}>
              <th colSpan={6}>{group.label}</th>
            </tr>
          )}
          {group.entries.map((entry) => (
            <DirectoryTableRow
              key={entry.name}
              entry={entry}
              currentPath={currentPath}
              isSelected={selectedNames.has(entry.name)}
              isDropTarget={canDropEntry(entry)}
              onOpenDirectory={onOpenDirectory}
              onRename={onRename}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDropEntry={onDropEntry}
              onSelectRow={onSelectRow}
              availableTags={availableTags}
              onTagsChange={onTagsChange}
              onOpenLightbox={onOpenLightbox}
            />
          ))}
        </Fragment>
      ))}
    </tbody>
  </table>
);
