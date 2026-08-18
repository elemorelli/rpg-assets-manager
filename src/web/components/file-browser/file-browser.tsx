import { type DragEvent, type JSX, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

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
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath, parentDirectory } from "#utils/paths.ts";
import { isPreviewableEntry } from "#utils/preview.ts";
import type { SearchResultEntry } from "#web/requests/files/entry/search.ts";
import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";
import { isValidDropTarget } from "#web/utils/drag-drop.ts";
import { groupEntries } from "#web/utils/entry-grouping.ts";
import {
  applySelectionClick,
  initialSelectionState,
  type SelectionClickModifier,
  type SelectionState,
} from "#web/utils/row-selection.ts";
import { runBatchOperation } from "#web/utils/run-batch-operation.ts";
import { sortEntries } from "#web/utils/sort-entries.ts";
import { useViewPreferences } from "#web/utils/use-view-preferences.ts";

import styles from "./file-browser.module.css";

export const FileBrowser = (): JSX.Element => {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPath = params["*"] ?? "";
  const query = searchParams.get("q") ?? "";
  const tagsParam = searchParams.get("tags") ?? "";
  const selectedTags = tagsParam ? tagsParam.split(",") : [];

  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultEntry[] | null>(null);
  const [tagFilterResults, setTagFilterResults] = useState<SearchResultEntry[] | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedEntries, setDraggedEntries] = useState<DirectoryEntry[]>([]);
  const [drawerExpandTrigger, setDrawerExpandTrigger] = useState<number | undefined>(undefined);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selection, setSelection] = useState<SelectionState>(initialSelectionState);
  const [lightboxEntryName, setLightboxEntryName] = useState<string | null>(null);
  const [isDropzoneActive, setIsDropzoneActive] = useState<boolean>(false);
  const externalDragCounterRef = useRef<number>(0);

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

  const loadDirectory = useCallback(async (path: string): Promise<void> => {
    setBusy(true);
    setError(null);

    try {
      const listed = await api.listDirectory(path);

      setEntries(listed);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshTags = useCallback(async (): Promise<void> => {
    const tags = await api.fetchTags();

    setAvailableTags(tags);
  }, []);

  const handleJobStarted = useCallback((): void => {
    setDrawerExpandTrigger((previous) => (previous ?? 0) + 1);
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
    setSelection(initialSelectionState);
  }, [currentPath, loadDirectory]);

  useEffect(() => {
    refreshTags();
  }, [refreshTags]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSearchResults(null);

      return;
    }

    api
      .searchEntries(trimmedQuery)
      .then(setSearchResults)
      .catch((caught: unknown) => setError(describeError(caught)));
  }, [query]);

  useEffect(() => {
    if (selectedTags.length === 0) {
      setTagFilterResults(null);

      return;
    }

    api
      .fetchFilesByTag(selectedTags)
      .then(setTagFilterResults)
      .catch((caught: unknown) => setError(describeError(caught)));
    // selectedTags is a fresh array every render; depend on tagsParam instead to avoid refetching on every render.
  }, [tagsParam]);

  const runAction = (action: () => Promise<void>): void => {
    setBusy(true);
    setError(null);

    action()
      .then(() => loadDirectory(currentPath))
      .catch((caught: unknown) => {
        setError(describeError(caught));
        setBusy(false);
      });
  };

  const navigateToPath = (path: string): void => {
    navigate(`/${path}`);
  };

  const handleOpenDirectory = (name: string): void => {
    navigateToPath(joinRelativePath(currentPath, name));
  };

  const handleCreateDirectory = (name: string): void => {
    runAction(() => api.createDirectory(joinRelativePath(currentPath, name)));
  };

  const handleUploadFile = (file: File): void => {
    runAction(() => api.uploadFile(currentPath, file));
  };

  const handleRescan = (forceRehash: boolean): void => {
    runAction(() => api.rescan(forceRehash).then(() => undefined));
  };

  const handleRename = (entry: DirectoryEntry, newName: string): void => {
    runAction(() => api.renameEntry(joinRelativePath(currentPath, entry.name), newName));
  };

  const handleDelete = (entry: DirectoryEntry): void => {
    runAction(() => api.deleteEntry(joinRelativePath(currentPath, entry.name)));
  };

  const handleTreeRename = (path: string, newName: string): void => {
    runAction(() => api.renameEntry(path, newName));
  };

  const handleTreeDelete = (path: string): void => {
    runAction(() => api.deleteEntry(path));
  };

  const handleTreeTagsChange = (path: string, tags: string[]): void => {
    runAction(() => api.setAssetTags(path, tags).then(() => refreshTags()));
  };

  const handleSearch = (nextQuery: string): void => {
    const trimmed = nextQuery.trim();

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      if (trimmed) {
        next.set("q", trimmed);
      } else {
        next.delete("q");
      }

      return next;
    });
  };

  const handleTagsChange = (entry: DirectoryEntry, tags: string[]): void => {
    const entryPath = joinRelativePath(currentPath, entry.name);

    runAction(() => api.setAssetTags(entryPath, tags).then(() => refreshTags()));
  };

  const handleOpenLightbox = (entry: DirectoryEntry): void => {
    setLightboxEntryName(entry.name);
  };

  const handleCloseLightbox = (): void => {
    setLightboxEntryName(null);
  };

  const handleLightboxPrev = (): void => {
    if (lightboxIndex > 0) {
      setLightboxEntryName(previewableEntries[lightboxIndex - 1].name);
    }
  };

  const handleLightboxNext = (): void => {
    if (lightboxIndex !== -1 && lightboxIndex < previewableEntries.length - 1) {
      setLightboxEntryName(previewableEntries[lightboxIndex + 1].name);
    }
  };

  const handleLightboxRename = (entry: DirectoryEntry, newName: string): void => {
    handleRename(entry, newName);
    setLightboxEntryName(newName);
  };

  const handleLightboxDelete = (entry: DirectoryEntry): void => {
    const fallbackEntry =
      previewableEntries[lightboxIndex + 1] ?? previewableEntries[lightboxIndex - 1];

    handleDelete(entry);
    setLightboxEntryName(fallbackEntry?.name ?? null);
  };

  const handleToggleTag = (tag: string): void => {
    const nextSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter((selected) => selected !== tag)
      : [...selectedTags, tag];

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      if (nextSelectedTags.length > 0) {
        next.set("tags", nextSelectedTags.join(","));
      } else {
        next.delete("tags");
      }

      return next;
    });
  };

  const handleOpenSearchResult = (entry: SearchResultEntry): void => {
    const targetDirectory =
      entry.type === "directory" ? entry.relativePath : parentDirectory(entry.relativePath);

    navigateToPath(targetDirectory);
  };

  const handleSelectRow = (entry: DirectoryEntry, modifier: SelectionClickModifier): void => {
    const orderedNames = sortedEntries.map((candidate) => candidate.name);

    setSelection((prev) => applySelectionClick(prev, orderedNames, entry.name, modifier));
  };

  const handleDragStart = (entry: DirectoryEntry): void => {
    const isPartOfSelection = selection.selectedNames.has(entry.name);
    const namesToDrag = isPartOfSelection ? selection.selectedNames : new Set([entry.name]);

    if (!isPartOfSelection) {
      setSelection({ selectedNames: namesToDrag, anchorName: entry.name });
    }

    setDraggedEntries(entries.filter((candidate) => namesToDrag.has(candidate.name)));
  };

  const handleDragEnd = (): void => {
    setDraggedEntries([]);
  };

  const canDropOnDirectory = (targetDirectoryPath: string): boolean => {
    if (draggedEntries.length === 0) {
      return false;
    }

    return draggedEntries.every((entry) =>
      isValidDropTarget(
        { relativePath: joinRelativePath(currentPath, entry.name), type: entry.type },
        targetDirectoryPath,
      ),
    );
  };

  const runBatchMove = (entriesToMove: DirectoryEntry[], targetDirectoryPath: string): void => {
    setBusy(true);
    setError(null);

    const performBatchMove = async (): Promise<void> => {
      const { errorMessage } = await runBatchOperation(
        entriesToMove,
        (entry) =>
          api.moveEntry(
            joinRelativePath(currentPath, entry.name),
            joinRelativePath(targetDirectoryPath, entry.name),
          ),
        (entry) => entry.name,
        "Moved",
      );

      // Refresh the listing before surfacing the outcome: loadDirectory
      // clears the error state on entry, so setting it beforehand would
      // have the refresh immediately wipe out a batch-move failure message.
      await loadDirectory(currentPath);

      if (errorMessage) {
        setError(errorMessage);
      } else {
        setSelection(initialSelectionState);
      }
    };

    void performBatchMove();
  };

  const handleDropOnDirectory = (targetDirectoryPath: string): void => {
    if (!canDropOnDirectory(targetDirectoryPath)) {
      setDraggedEntries([]);

      return;
    }

    const entriesToMove = draggedEntries;

    setDraggedEntries([]);
    runBatchMove(entriesToMove, targetDirectoryPath);
  };

  const canDropOnEntry = (targetEntry: DirectoryEntry): boolean =>
    targetEntry.type === "directory" &&
    canDropOnDirectory(joinRelativePath(currentPath, targetEntry.name));

  const handleDropOnEntry = (targetEntry: DirectoryEntry): void => {
    handleDropOnDirectory(joinRelativePath(currentPath, targetEntry.name));
  };

  const carriesExternalFiles = (event: DragEvent<HTMLDivElement>): boolean =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

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

  const handleDropzoneDragEnter = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesExternalFiles(event)) {
      return;
    }

    event.preventDefault();
    externalDragCounterRef.current += 1;
    setIsDropzoneActive(true);
  };

  const handleDropzoneDragOver = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesExternalFiles(event)) {
      return;
    }

    event.preventDefault();
  };

  const handleDropzoneDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesExternalFiles(event)) {
      return;
    }

    externalDragCounterRef.current -= 1;

    if (externalDragCounterRef.current <= 0) {
      externalDragCounterRef.current = 0;
      setIsDropzoneActive(false);
    }
  };

  const handleDropzoneDrop = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesExternalFiles(event)) {
      return;
    }

    event.preventDefault();
    externalDragCounterRef.current = 0;
    setIsDropzoneActive(false);

    const files = Array.from(event.dataTransfer?.files ?? []);

    if (files.length > 0) {
      runBatchUpload(files);
    }
  };

  const sortedEntries = sortEntries(entries, sortCriterion, sortDirection);
  const groups = groupEntries(sortedEntries, groupCriterion);

  const previewableEntries = sortedEntries.filter((entry) => isPreviewableEntry(entry));
  const lightboxIndex =
    lightboxEntryName === null
      ? -1
      : previewableEntries.findIndex((entry) => entry.name === lightboxEntryName);
  const lightboxEntry = lightboxIndex === -1 ? null : previewableEntries[lightboxIndex];

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
