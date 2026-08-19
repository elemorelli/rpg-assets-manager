import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { Fragment, type JSX } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import type { EntryGroup } from "#web/utils/entry-grouping.ts";
import type { SelectionClickModifier } from "#web/utils/row-selection.ts";
import type { SortCriterion, SortDirection } from "#web/utils/sort-entries.ts";

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
  sortCriterion: SortCriterion;
  sortDirection: SortDirection;
  onSortCriterionClick: (criterion: SortCriterion) => void;
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
  sortCriterion,
  sortDirection,
  onSortCriterionClick,
}: DirectoryTableProps): JSX.Element => {
  const renderSortableHeaderButton = (criterion: SortCriterion, label: string): JSX.Element => {
    const isActive = sortCriterion === criterion;

    return (
      <button
        type="button"
        className={clsx(styles.sortableHeader, isActive && styles.sortActive)}
        aria-pressed={isActive}
        onClick={() => onSortCriterionClick(criterion)}>
        {label}
        {isActive && (
          <FontAwesomeIcon
            icon={sortDirection === "asc" ? faArrowUp : faArrowDown}
            className={styles.directionIcon}
            aria-hidden="true"
            data-testid={`table-sort-direction-icon-${criterion}`}
          />
        )}
      </button>
    );
  };

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.preview} aria-label="Preview" />
          <th>{renderSortableHeaderButton("name", "Name")}</th>
          <th className={styles.shrink}>{renderSortableHeaderButton("type", "Type")}</th>
          <th className={styles.shrink}>{renderSortableHeaderButton("size", "Size")}</th>
          <th className={styles.actions} aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => (
          <Fragment key={group.label ?? UNGROUPED_KEY}>
            {group.label !== null && (
              <tr className={styles.groupHeader}>
                <th colSpan={5}>{group.label}</th>
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
};
