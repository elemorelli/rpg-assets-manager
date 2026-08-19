import { faUpload } from "@fortawesome/free-solid-svg-icons";
import { type JSX, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { AppShell } from "#components/app-shell/app-shell.tsx";
import { Breadcrumbs } from "#components/breadcrumbs/breadcrumbs.tsx";
import { JobProgress } from "#components/job-progress/job-progress.tsx";
import { Lightbox } from "#components/lightbox/lightbox.tsx";
import { ProgressModal } from "#components/progress-modal/progress-modal.tsx";
import { TreeView } from "#components/tree-view/tree-view.tsx";
import { joinRelativePath } from "#utils/paths.ts";
import { isPreviewableEntry } from "#utils/preview.ts";
import { groupEntries } from "#web/utils/entry-grouping.ts";
import { initialSelectionState } from "#web/utils/row-selection.ts";
import type { SortCriterion } from "#web/utils/sort-entries.ts";
import { getNextSort, sortEntries } from "#web/utils/sort-entries.ts";
import { useContextMenu } from "#web/utils/use-context-menu.ts";
import { useViewPreferences } from "#web/utils/use-view-preferences.ts";

import styles from "./file-browser.module.css";
import { FileBrowserContent } from "./file-browser-content.tsx";
import { FileBrowserControls } from "./file-browser-controls.tsx";
import { FileBrowserModals } from "./file-browser-modals.tsx";
import { useAvailableTags } from "./use-available-tags.ts";
import { useDirectoryActions } from "./use-directory-actions.ts";
import { useDirectoryListing } from "./use-directory-listing.ts";
import { useEntrySelectionAndDrag } from "./use-entry-selection-and-drag.ts";
import { useFileDropzone } from "./use-file-dropzone.ts";
import { useFileUpload } from "./use-file-upload.ts";
import { useFoundryPendingStatus } from "./use-foundry-pending-status.ts";
import { useLightboxNavigation } from "./use-lightbox-navigation.ts";
import { useSearchAndTagFilter } from "./use-search-and-tag-filter.ts";

const JOB_TYPES_THAT_REFRESH_THE_DIRECTORY = new Set(["sync", "rescan", "reconcile", "convert"]);

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

  const handleJobSucceeded = (type: string): void => {
    if (!JOB_TYPES_THAT_REFRESH_THE_DIRECTORY.has(type)) {
      return;
    }

    loadDirectory(currentPath);

    if (type === "sync") {
      setFoundryStatusRefreshTrigger((trigger) => trigger + 1);
    }
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
    uploadProgress,
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

  const directoryContextMenu = useContextMenu();

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
            <FileBrowserControls
              busy={busy}
              onCreateDirectory={handleCreateDirectory}
              onUploadFile={handleUploadFile}
              onRescan={handleRescan}
              onConvert={() => setConvertModalOpen(true)}
              onSync={() => setSyncModalOpen(true)}
              onReconcile={() => setReconciliationModalOpen(true)}
              onFoundry={() => setFoundryModalOpen(true)}
              hasPendingFoundryMacro={hasPendingFoundryMacro}
              showViewControls={searchResults === null && tagFilterResults === null}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortCriterion={sortCriterion}
              sortDirection={sortDirection}
              onSortCriterionClick={handleSortCriterionClick}
              groupCriterion={groupCriterion}
              onGroupCriterionChange={setGroupCriterion}
              onSearch={handleSearch}
              availableTags={availableTags}
              selectedTags={selectedTags}
              onToggleTag={handleToggleTag}
            />
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
            <FileBrowserContent
              currentPath={currentPath}
              busy={busy}
              isDropzoneActive={isDropzoneActive}
              onDropzoneDragEnter={handleDropzoneDragEnter}
              onDropzoneDragOver={handleDropzoneDragOver}
              onDropzoneDragLeave={handleDropzoneDragLeave}
              onDropzoneDrop={handleDropzoneDrop}
              directoryContextMenuPosition={directoryContextMenu.position}
              onOpenDirectoryContextMenu={directoryContextMenu.open}
              onCloseDirectoryContextMenu={directoryContextMenu.close}
              onCreateDirectory={handleCreateDirectory}
              onUploadFile={handleUploadFile}
              onConvert={() => setConvertModalOpen(true)}
              searchResults={searchResults}
              tagFilterResults={tagFilterResults}
              onOpenSearchResult={handleOpenSearchResult}
              viewMode={viewMode}
              groups={groups}
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
            <FileBrowserModals
              currentPath={currentPath}
              isConvertModalOpen={isConvertModalOpen}
              onCloseConvertModal={() => setConvertModalOpen(false)}
              onConverted={() => loadDirectory(currentPath)}
              isSyncModalOpen={isSyncModalOpen}
              onCloseSyncModal={() => setSyncModalOpen(false)}
              onSyncApplied={() => {
                loadDirectory(currentPath);
                setFoundryStatusRefreshTrigger((trigger) => trigger + 1);
              }}
              isReconciliationModalOpen={isReconciliationModalOpen}
              onCloseReconciliationModal={() => setReconciliationModalOpen(false)}
              isFoundryModalOpen={isFoundryModalOpen}
              onCloseFoundryModal={() => setFoundryModalOpen(false)}
              onFoundryMarkedApplied={refreshFoundryPendingStatus}
              conflictingFileNames={conflictingFileNames}
              onConfirmOverwrite={confirmOverwrite}
              onCancelOverwrite={cancelOverwrite}
            />
            {uploadProgress && (
              <ProgressModal
                title="Uploading files"
                icon={faUpload}
                done={uploadProgress.done}
                total={uploadProgress.total}
                detail={uploadProgress.detail}
                onClose={() => {}}
              />
            )}
          </div>
        }
        drawer={<JobProgress onJobSucceeded={handleJobSucceeded} />}
      />
    </>
  );
};
