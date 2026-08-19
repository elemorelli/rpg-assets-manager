import { type JSX, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { AppShell } from "#components/app-shell/app-shell.tsx";
import { Breadcrumbs } from "#components/breadcrumbs/breadcrumbs.tsx";
import { ConvertModal } from "#components/convert-modal/convert-modal.tsx";
import { DirectoryGrid } from "#components/directory-grid/directory-grid.tsx";
import { DirectoryTable } from "#components/directory-table/directory-table.tsx";
import { FolderActionsMenu } from "#components/folder-actions-menu/folder-actions-menu.tsx";
import { FoundryModal } from "#components/foundry-modal/foundry-modal.tsx";
import { JobProgress } from "#components/job-progress/job-progress.tsx";
import { Lightbox } from "#components/lightbox/lightbox.tsx";
import { OverwriteConfirmModal } from "#components/overwrite-confirm-modal/overwrite-confirm-modal.tsx";
import { ReconciliationModal } from "#components/reconciliation-modal/reconciliation-modal.tsx";
import { SearchBox } from "#components/search-box/search-box.tsx";
import { SearchResults } from "#components/search-results/search-results.tsx";
import { SyncModal } from "#components/sync-modal/sync-modal.tsx";
import { TagFilter } from "#components/tag-filter/tag-filter.tsx";
import { Toolbar } from "#components/toolbar/toolbar.tsx";
import { TreeView } from "#components/tree-view/tree-view.tsx";
import { ViewControls } from "#components/view-controls/view-controls.tsx";
import { joinRelativePath } from "#utils/paths.ts";
import { isPreviewableEntry } from "#utils/preview.ts";
import { groupEntries } from "#web/utils/entry-grouping.ts";
import { initialSelectionState } from "#web/utils/row-selection.ts";
import type { SortCriterion } from "#web/utils/sort-entries.ts";
import { getNextSort, sortEntries } from "#web/utils/sort-entries.ts";
import { useContextMenu } from "#web/utils/use-context-menu.ts";
import { useViewPreferences } from "#web/utils/use-view-preferences.ts";

import styles from "./file-browser.module.css";
import { useAvailableTags } from "./use-available-tags.ts";
import { useDirectoryActions } from "./use-directory-actions.ts";
import { useDirectoryListing } from "./use-directory-listing.ts";
import { useEntrySelectionAndDrag } from "./use-entry-selection-and-drag.ts";
import { useFileDropzone } from "./use-file-dropzone.ts";
import { useFileUpload } from "./use-file-upload.ts";
import { useFoundryPendingStatus } from "./use-foundry-pending-status.ts";
import { useLightboxNavigation } from "./use-lightbox-navigation.ts";
import { useSearchAndTagFilter } from "./use-search-and-tag-filter.ts";

export const FileBrowser = (): JSX.Element => {
  const params = useParams();
  const navigate = useNavigate();

  const currentPath = params["*"] ?? "";

  const [isConvertModalOpen, setConvertModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setSyncModalOpen] = useState<boolean>(false);
  const [isReconciliationModalOpen, setReconciliationModalOpen] = useState<boolean>(false);
  const [isFoundryModalOpen, setFoundryModalOpen] = useState<boolean>(false);
  const [foundryStatusRefreshTrigger, setFoundryStatusRefreshTrigger] = useState<number>(0);

  const { hasPendingFoundryMacro, refreshFoundryPendingStatus } = useFoundryPendingStatus(
    foundryStatusRefreshTrigger,
  );

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

  const handleSortCriterionClick = (criterion: SortCriterion): void => {
    const nextSort = getNextSort(criterion, { criterion: sortCriterion, direction: sortDirection });

    setSortCriterion(nextSort.criterion);
    setSortDirection(nextSort.direction);
  };

  const {
    handleCreateDirectory,
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

  const {
    handleUploadFile,
    handleFilesDropped,
    conflictingFileNames,
    confirmOverwrite,
    cancelOverwrite,
  } = useFileUpload({ currentPath, setBusy, setError, loadDirectory });

  const {
    isDropzoneActive,
    handleDropzoneDragEnter,
    handleDropzoneDragOver,
    handleDropzoneDragLeave,
    handleDropzoneDrop,
  } = useFileDropzone({ onFilesDropped: handleFilesDropped });

  const folderContextMenu = useContextMenu();

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
                  onConvert={() => setConvertModalOpen(true)}
                  onSync={() => setSyncModalOpen(true)}
                  onReconcile={() => setReconciliationModalOpen(true)}
                  onFoundry={() => setFoundryModalOpen(true)}
                  hasPendingFoundryMacro={hasPendingFoundryMacro}
                />
                {searchResults === null && tagFilterResults === null && (
                  <ViewControls
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    sortCriterion={sortCriterion}
                    sortDirection={sortDirection}
                    onSortCriterionClick={handleSortCriterionClick}
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
              onDrop={handleDropzoneDrop}
              onContextMenu={busy ? undefined : folderContextMenu.open}>
              <FolderActionsMenu
                position={folderContextMenu.position}
                onClose={folderContextMenu.close}
                onCreateDirectory={handleCreateDirectory}
                onUploadFile={handleUploadFile}
                onConvert={() => setConvertModalOpen(true)}
              />
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
                      sortCriterion={sortCriterion}
                      sortDirection={sortDirection}
                      onSortCriterionClick={handleSortCriterionClick}
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
            {isConvertModalOpen && (
              <ConvertModal
                currentPath={currentPath}
                onClose={() => setConvertModalOpen(false)}
                onConverted={() => loadDirectory(currentPath)}
              />
            )}
            {isSyncModalOpen && (
              <SyncModal
                onClose={() => setSyncModalOpen(false)}
                onApplied={() => {
                  loadDirectory(currentPath);
                  setFoundryStatusRefreshTrigger((trigger) => trigger + 1);
                }}
              />
            )}
            {isReconciliationModalOpen && (
              <ReconciliationModal onClose={() => setReconciliationModalOpen(false)} />
            )}
            {isFoundryModalOpen && (
              <FoundryModal
                onClose={() => setFoundryModalOpen(false)}
                onMarkedApplied={refreshFoundryPendingStatus}
              />
            )}
            {conflictingFileNames && (
              <OverwriteConfirmModal
                fileNames={conflictingFileNames}
                onConfirm={confirmOverwrite}
                onCancel={cancelOverwrite}
              />
            )}
          </div>
        }
        drawer={<JobProgress />}
      />
    </>
  );
};
