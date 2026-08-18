import { type JSX, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { AppShell } from "#components/app-shell/app-shell.tsx";
import { Breadcrumbs } from "#components/breadcrumbs/breadcrumbs.tsx";
import { ConversionPanel } from "#components/conversion-panel/conversion-panel.tsx";
import { DirectoryGrid } from "#components/directory-grid/directory-grid.tsx";
import { DirectoryTable } from "#components/directory-table/directory-table.tsx";
import { JobProgress } from "#components/job-progress/job-progress.tsx";
import { Lightbox } from "#components/lightbox/lightbox.tsx";
import { PanelDrawer } from "#components/panel-drawer/panel-drawer.tsx";
import { SearchBox } from "#components/search-box/search-box.tsx";
import { SearchResults } from "#components/search-results/search-results.tsx";
import { SyncSection } from "#components/sync-section/sync-section.tsx";
import { TagFilter } from "#components/tag-filter/tag-filter.tsx";
import { Toolbar } from "#components/toolbar/toolbar.tsx";
import { TreeView } from "#components/tree-view/tree-view.tsx";
import { ViewControls } from "#components/view-controls/view-controls.tsx";
import { joinRelativePath } from "#utils/paths.ts";
import { isPreviewableEntry } from "#utils/preview.ts";
import * as api from "#web/requests/index.ts";
import { groupEntries } from "#web/utils/entry-grouping.ts";
import { initialSelectionState } from "#web/utils/row-selection.ts";
import { runBatchOperation } from "#web/utils/run-batch-operation.ts";
import { sortEntries } from "#web/utils/sort-entries.ts";
import { useViewPreferences } from "#web/utils/use-view-preferences.ts";

import styles from "./file-browser.module.css";
import { useAvailableTags } from "./use-available-tags.ts";
import { useDirectoryActions } from "./use-directory-actions.ts";
import { useDirectoryListing } from "./use-directory-listing.ts";
import { useEntrySelectionAndDrag } from "./use-entry-selection-and-drag.ts";
import { useFileDropzone } from "./use-file-dropzone.ts";
import { useLightboxNavigation } from "./use-lightbox-navigation.ts";
import { useSearchAndTagFilter } from "./use-search-and-tag-filter.ts";

export const FileBrowser = (): JSX.Element => {
  const params = useParams();
  const navigate = useNavigate();

  const currentPath = params["*"] ?? "";

  const [drawerExpandTrigger, setDrawerExpandTrigger] = useState<number | undefined>(undefined);

  const {
    viewMode,
    setViewMode,
    sortCriterion,
    setSortCriterion,
    sortDirection,
    setSortDirection,
    groupCriterion,
    setGroupCriterion,
  } = useViewPreferences(currentPath);

  const { entries, busy, error, setBusy, setError, loadDirectory, runAction } =
    useDirectoryListing(currentPath);
  const { availableTags, refreshTags } = useAvailableTags();

  const navigateToPath = (path: string): void => {
    navigate(`/${path}`);
  };

  const handleOpenDirectory = (name: string): void => {
    navigateToPath(joinRelativePath(currentPath, name));
  };

  const {
    handleCreateDirectory,
    handleUploadFile,
    handleRescan,
    handleRename,
    handleDelete,
    handleTreeRename,
    handleTreeDelete,
    handleTreeTagsChange,
    handleTagsChange,
  } = useDirectoryActions({ currentPath, runAction, refreshTags });

  const {
    selectedTags,
    searchResults,
    tagFilterResults,
    handleSearch,
    handleToggleTag,
    handleOpenSearchResult,
  } = useSearchAndTagFilter({ onNavigate: navigateToPath, onError: setError });

  const handleJobStarted = useCallback((): void => {
    setDrawerExpandTrigger((previous) => (previous ?? 0) + 1);
  }, []);

  const sortedEntries = sortEntries(entries, sortCriterion, sortDirection);
  const groups = groupEntries(sortedEntries, groupCriterion);

  const {
    selection,
    setSelection,
    handleSelectRow,
    handleDragStart,
    handleDragEnd,
    canDropOnDirectory,
    canDropOnEntry,
    handleDropOnDirectory,
    handleDropOnEntry,
  } = useEntrySelectionAndDrag({
    entries,
    sortedEntries,
    currentPath,
    setBusy,
    setError,
    loadDirectory,
  });

  useEffect(() => {
    setSelection(initialSelectionState);
  }, [currentPath, setSelection]);

  const previewableEntries = sortedEntries.filter((entry) => isPreviewableEntry(entry));

  const {
    lightboxEntry,
    lightboxIndex,
    handleOpenLightbox,
    handleCloseLightbox,
    handleLightboxPrev,
    handleLightboxNext,
    handleLightboxRename,
    handleLightboxDelete,
  } = useLightboxNavigation({ previewableEntries, onRename: handleRename, onDelete: handleDelete });

  const runBatchUpload = (files: File[]): void => {
    setBusy(true);
    setError(null);

    const performBatchUpload = async (): Promise<void> => {
      const { errorMessage } = await runBatchOperation(
        files,
        (file) => api.uploadFile(currentPath, file),
        (file) => file.name,
        "Uploaded",
      );

      await loadDirectory(currentPath);

      if (errorMessage) {
        setError(errorMessage);
      }
    };

    void performBatchUpload();
  };

  const {
    isDropzoneActive,
    handleDropzoneDragEnter,
    handleDropzoneDragOver,
    handleDropzoneDragLeave,
    handleDropzoneDrop,
  } = useFileDropzone({ onFilesDropped: runBatchUpload });

  return (
    <>
      <div className={styles.breadcrumbBar}>
        <Breadcrumbs
          currentPath={currentPath}
          onNavigate={navigateToPath}
          canDropOnPath={canDropOnDirectory}
          onDropEntry={handleDropOnDirectory}
        />
      </div>
      <AppShell
        sidebar={
          <TreeView
            activePath={currentPath}
            onNavigate={navigateToPath}
            canDropOnPath={canDropOnDirectory}
            onDropEntry={handleDropOnDirectory}
            onRename={handleTreeRename}
            onDelete={handleTreeDelete}
            availableTags={availableTags}
            onTagsChange={handleTreeTagsChange}
          />
        }
        main={
          <div className={styles.fileBrowser}>
            <div className={styles.controls}>
              <div className={styles.controlsGroup}>
                <Toolbar
                  busy={busy}
                  onCreateDirectory={handleCreateDirectory}
                  onUploadFile={handleUploadFile}
                  onRescan={handleRescan}
                />
                {searchResults === null && tagFilterResults === null && (
                  <ViewControls
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    sortCriterion={sortCriterion}
                    onSortCriterionChange={setSortCriterion}
                    sortDirection={sortDirection}
                    onSortDirectionChange={setSortDirection}
                    groupCriterion={groupCriterion}
                    onGroupCriterionChange={setGroupCriterion}
                  />
                )}
              </div>
              <div className={styles.controlsGroup}>
                <SearchBox onSearch={handleSearch} />
                <TagFilter
                  availableTags={availableTags}
                  selectedTags={selectedTags}
                  onToggleTag={handleToggleTag}
                />
              </div>
            </div>
            {error && (
              <p className={styles.error}>
                {error}
                {currentPath !== "" && (
                  <>
                    {" "}
                    <button type="button" onClick={() => navigateToPath("")}>
                      Back to root
                    </button>
                  </>
                )}
              </p>
            )}
            <div
              className={styles.dropzone}
              data-testid="directory-dropzone"
              onDragEnter={handleDropzoneDragEnter}
              onDragOver={handleDropzoneDragOver}
              onDragLeave={handleDropzoneDragLeave}
              onDrop={handleDropzoneDrop}>
              {isDropzoneActive && (
                <div className={styles.dropzoneOverlay}>
                  {`Drop files to upload to ${currentPath === "" ? "root" : currentPath}`}
                </div>
              )}
              {searchResults !== null ? (
                <SearchResults results={searchResults} onOpenResult={handleOpenSearchResult} />
              ) : tagFilterResults !== null ? (
                <SearchResults results={tagFilterResults} onOpenResult={handleOpenSearchResult} />
              ) : (
                <>
                  {viewMode === "table" ? (
                    <DirectoryTable
                      groups={groups}
                      currentPath={currentPath}
                      onOpenDirectory={handleOpenDirectory}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      canDropEntry={canDropOnEntry}
                      onDropEntry={handleDropOnEntry}
                      availableTags={availableTags}
                      onTagsChange={handleTagsChange}
                      selectedNames={selection.selectedNames}
                      onSelectRow={handleSelectRow}
                      onOpenLightbox={handleOpenLightbox}
                    />
                  ) : (
                    <DirectoryGrid
                      groups={groups}
                      currentPath={currentPath}
                      onOpenDirectory={handleOpenDirectory}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      canDropEntry={canDropOnEntry}
                      onDropEntry={handleDropOnEntry}
                      availableTags={availableTags}
                      onTagsChange={handleTagsChange}
                      selectedNames={selection.selectedNames}
                      onSelectRow={handleSelectRow}
                      onOpenLightbox={handleOpenLightbox}
                    />
                  )}
                </>
              )}
            </div>
            {lightboxEntry && (
              <Lightbox
                entry={lightboxEntry}
                relativePath={joinRelativePath(currentPath, lightboxEntry.name)}
                hasPrev={lightboxIndex > 0}
                hasNext={lightboxIndex < previewableEntries.length - 1}
                onPrev={handleLightboxPrev}
                onNext={handleLightboxNext}
                onClose={handleCloseLightbox}
                onRename={handleLightboxRename}
                onDelete={handleLightboxDelete}
                availableTags={availableTags}
                onTagsChange={handleTagsChange}
              />
            )}
          </div>
        }
        drawer={
          <PanelDrawer expandTrigger={drawerExpandTrigger}>
            <JobProgress onJobStarted={handleJobStarted} />
            <ConversionPanel onConverted={() => loadDirectory(currentPath)} />
            <SyncSection onApplied={() => loadDirectory(currentPath)} />
          </PanelDrawer>
        }
      />
    </>
  );
};
