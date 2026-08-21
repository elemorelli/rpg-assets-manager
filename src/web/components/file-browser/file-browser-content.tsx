import type { DragEvent, JSX } from "react";

import { DirectoryActionsMenu } from "#components/directory-actions-menu/directory-actions-menu.tsx";
import { DirectoryGrid } from "#components/directory-grid/directory-grid.tsx";
import { DirectoryTable } from "#components/directory-table/directory-table.tsx";
import { SearchResults } from "#components/search-results/search-results.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import type { SearchResultEntry } from "#web/requests/files/entry/search.ts";
import type { EntryGroup } from "#web/utils/entry-grouping.ts";
import type { SelectionClickModifier } from "#web/utils/row-selection.ts";
import type { SortCriterion, SortDirection } from "#web/utils/sort-entries.ts";
import type { ContextMenuPosition, ContextMenuTriggerEvent } from "#web/utils/use-context-menu.ts";
import type { ViewMode } from "#web/utils/use-view-preferences.ts";

import styles from "./file-browser.module.css";

export interface FileBrowserContentProps {
  currentPath: string;
  busy: boolean;
  isDropzoneActive: boolean;
  onDropzoneDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDropzoneDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDropzoneDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDropzoneDrop: (event: DragEvent<HTMLDivElement>) => void;
  directoryContextMenuPosition: ContextMenuPosition | null;
  onOpenDirectoryContextMenu: (event: ContextMenuTriggerEvent) => void;
  onCloseDirectoryContextMenu: () => void;
  onCreateDirectory: (name: string) => void;
  onUploadFile: (file: File) => void;
  onConvert: () => void;
  searchResults: SearchResultEntry[] | null;
  tagFilterResults: SearchResultEntry[] | null;
  onOpenSearchResult: (entry: SearchResultEntry) => void;
  viewMode: ViewMode;
  groups: EntryGroup[];
  onOpenDirectory: (name: string) => void;
  onRename: (entry: DirectoryEntry, newName: string) => void;
  onDelete: (entry: DirectoryEntry) => void;
  onDeleteMany: (entries: DirectoryEntry[]) => void;
  onDragStart: (entry: DirectoryEntry) => void;
  onDragEnd: () => void;
  canDropEntry: (entry: DirectoryEntry) => boolean;
  onDropEntry: (entry: DirectoryEntry) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
  onAddTagToMany: (entries: DirectoryEntry[], tag: string) => void;
  selectedNames: Set<string>;
  selectedEntries: DirectoryEntry[];
  onSelectRow: (entry: DirectoryEntry, modifier: SelectionClickModifier) => void;
  onOpenLightbox: (entry: DirectoryEntry) => void;
  sortCriterion: SortCriterion;
  sortDirection: SortDirection;
  onSortCriterionClick: (criterion: SortCriterion) => void;
}

export const FileBrowserContent = ({
  currentPath,
  busy,
  isDropzoneActive,
  onDropzoneDragEnter,
  onDropzoneDragOver,
  onDropzoneDragLeave,
  onDropzoneDrop,
  directoryContextMenuPosition,
  onOpenDirectoryContextMenu,
  onCloseDirectoryContextMenu,
  onCreateDirectory,
  onUploadFile,
  onConvert,
  searchResults,
  tagFilterResults,
  onOpenSearchResult,
  viewMode,
  groups,
  onOpenDirectory,
  onRename,
  onDelete,
  onDeleteMany,
  onDragStart,
  onDragEnd,
  canDropEntry,
  onDropEntry,
  availableTags,
  onTagsChange,
  onAddTagToMany,
  selectedNames,
  selectedEntries,
  onSelectRow,
  onOpenLightbox,
  sortCriterion,
  sortDirection,
  onSortCriterionClick,
}: FileBrowserContentProps): JSX.Element => (
  <div
    className={styles.dropzone}
    data-testid="directory-dropzone"
    onDragEnter={onDropzoneDragEnter}
    onDragOver={onDropzoneDragOver}
    onDragLeave={onDropzoneDragLeave}
    onDrop={onDropzoneDrop}
    onContextMenu={busy ? undefined : onOpenDirectoryContextMenu}>
    <DirectoryActionsMenu
      position={directoryContextMenuPosition}
      onClose={onCloseDirectoryContextMenu}
      onCreateDirectory={onCreateDirectory}
      onUploadFile={onUploadFile}
      onConvert={onConvert}
    />
    {isDropzoneActive && (
      <div className={styles.dropzoneOverlay}>
        {`Drop files to upload to ${currentPath === "" ? "root" : currentPath}`}
      </div>
    )}
    {searchResults !== null ? (
      <SearchResults results={searchResults} onOpenResult={onOpenSearchResult} />
    ) : tagFilterResults !== null ? (
      <SearchResults results={tagFilterResults} onOpenResult={onOpenSearchResult} />
    ) : viewMode === "table" ? (
      <DirectoryTable
        groups={groups}
        currentPath={currentPath}
        onOpenDirectory={onOpenDirectory}
        onRename={onRename}
        onDelete={onDelete}
        onDeleteMany={onDeleteMany}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        canDropEntry={canDropEntry}
        onDropEntry={onDropEntry}
        availableTags={availableTags}
        onTagsChange={onTagsChange}
        onAddTagToMany={onAddTagToMany}
        selectedNames={selectedNames}
        selectedEntries={selectedEntries}
        onSelectRow={onSelectRow}
        onOpenLightbox={onOpenLightbox}
        sortCriterion={sortCriterion}
        sortDirection={sortDirection}
        onSortCriterionClick={onSortCriterionClick}
      />
    ) : (
      <DirectoryGrid
        groups={groups}
        currentPath={currentPath}
        onOpenDirectory={onOpenDirectory}
        onRename={onRename}
        onDelete={onDelete}
        onDeleteMany={onDeleteMany}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        canDropEntry={canDropEntry}
        onDropEntry={onDropEntry}
        availableTags={availableTags}
        onTagsChange={onTagsChange}
        onAddTagToMany={onAddTagToMany}
        selectedNames={selectedNames}
        selectedEntries={selectedEntries}
        onSelectRow={onSelectRow}
        onOpenLightbox={onOpenLightbox}
      />
    )}
  </div>
);
