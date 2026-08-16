import { Fragment, type JSX } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import type { EntryGroup } from "#web/utils/entry-grouping.ts";
import type { SelectionClickModifier } from "#web/utils/row-selection.ts";

import styles from "./directory-grid.module.css";
import { DirectoryGridTile } from "./directory-grid-tile.tsx";

export interface DirectoryGridProps {
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

export const DirectoryGrid = ({
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
}: DirectoryGridProps): JSX.Element => (
  <div>
    {groups.map((group) => (
      <Fragment key={group.label ?? UNGROUPED_KEY}>
        {group.label !== null && <h3 className={styles.groupLabel}>{group.label}</h3>}
        <div className={styles.grid}>
          {group.entries.map((entry) => (
            <DirectoryGridTile
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
        </div>
      </Fragment>
    ))}
  </div>
);
