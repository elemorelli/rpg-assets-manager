import type { JSX } from "react";

import { SearchBox } from "#components/search-box/search-box.tsx";
import { TagFilter } from "#components/tag-filter/tag-filter.tsx";
import { Toolbar } from "#components/toolbar/toolbar.tsx";
import { ViewControls } from "#components/view-controls/view-controls.tsx";
import type { GroupCriterion } from "#web/utils/entry-grouping.ts";
import type { SortCriterion, SortDirection } from "#web/utils/sort-entries.ts";
import type { ViewMode } from "#web/utils/use-view-preferences.ts";

import styles from "./file-browser.module.css";

export interface FileBrowserControlsProps {
  busy: boolean;
  onCreateDirectory: (name: string) => void;
  onUploadFile: (file: File) => void;
  onRescan: (forceRehash: boolean) => void;
  onConvert: () => void;
  onSync: () => void;
  onReconcile: () => void;
  onFoundry: () => void;
  hasPendingFoundryMacro: boolean;
  hasPendingSyncChanges: boolean;
  showViewControls: boolean;
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  sortCriterion: SortCriterion;
  sortDirection: SortDirection;
  onSortCriterionClick: (criterion: SortCriterion) => void;
  groupCriterion: GroupCriterion;
  onGroupCriterionChange: (groupCriterion: GroupCriterion) => void;
  onSearch: (query: string) => void;
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export const FileBrowserControls = ({
  busy,
  onCreateDirectory,
  onUploadFile,
  onRescan,
  onConvert,
  onSync,
  onReconcile,
  onFoundry,
  hasPendingFoundryMacro,
  hasPendingSyncChanges,
  showViewControls,
  viewMode,
  onViewModeChange,
  sortCriterion,
  sortDirection,
  onSortCriterionClick,
  groupCriterion,
  onGroupCriterionChange,
  onSearch,
  availableTags,
  selectedTags,
  onToggleTag,
}: FileBrowserControlsProps): JSX.Element => (
  <div className={styles.controls}>
    <div className={styles.controlsGroup}>
      <Toolbar
        busy={busy}
        onCreateDirectory={onCreateDirectory}
        onUploadFile={onUploadFile}
        onRescan={onRescan}
        onConvert={onConvert}
        onSync={onSync}
        onReconcile={onReconcile}
        onFoundry={onFoundry}
        hasPendingFoundryMacro={hasPendingFoundryMacro}
        hasPendingSyncChanges={hasPendingSyncChanges}
      />
      {showViewControls && (
        <ViewControls
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          sortCriterion={sortCriterion}
          sortDirection={sortDirection}
          onSortCriterionClick={onSortCriterionClick}
          groupCriterion={groupCriterion}
          onGroupCriterionChange={onGroupCriterionChange}
        />
      )}
    </div>
    <div className={styles.controlsGroup}>
      <SearchBox onSearch={onSearch} />
      <TagFilter
        availableTags={availableTags}
        selectedTags={selectedTags}
        onToggleTag={onToggleTag}
      />
    </div>
  </div>
);
