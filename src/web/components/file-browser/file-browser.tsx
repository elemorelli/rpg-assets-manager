import { type JSX, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { AppShell } from "#components/app-shell/app-shell.tsx";
import { Breadcrumbs } from "#components/breadcrumbs/breadcrumbs.tsx";
import { ConversionPanel } from "#components/conversion-panel/conversion-panel.tsx";
import { DirectoryGrid } from "#components/directory-grid/directory-grid.tsx";
import { DirectoryTable } from "#components/directory-table/directory-table.tsx";
import { JobProgress } from "#components/job-progress/job-progress.tsx";
import { Lightbox } from "#components/lightbox/lightbox.tsx";
import { PanelDrawer } from "#components/panel-drawer/panel-drawer.tsx";
import { ReconciliationPanel } from "#components/reconciliation-panel/reconciliation-panel.tsx";
import { SearchBox } from "#components/search-box/search-box.tsx";
import { SearchResults } from "#components/search-results/search-results.tsx";
import { SyncHistoryPanel } from "#components/sync-history-panel/sync-history-panel.tsx";
import { SyncPanel } from "#components/sync-panel/sync-panel.tsx";
import { TagFilter } from "#components/tag-filter/tag-filter.tsx";
import { Toolbar } from "#components/toolbar/toolbar.tsx";
import { TreeView } from "#components/tree-view/tree-view.tsx";
import { ViewControls } from "#components/view-controls/view-controls.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath, parentDirectory } from "#utils/paths.ts";
import { resolvePreviewSource } from "#utils/preview.ts";
import type { SearchResultEntry } from "#web/requests/files/entry/search.ts";
import * as api from "#web/requests/index.ts";
import { isValidDropTarget } from "#web/utils/drag-drop.ts";
import { groupEntries } from "#web/utils/entry-grouping.ts";
import {
  applySelectionClick,
  initialSelectionState,
  type SelectionClickModifier,
  type SelectionState,
} from "#web/utils/row-selection.ts";
import { sortEntries } from "#web/utils/sort-entries.ts";
import { useViewPreferences } from "#web/utils/use-view-preferences.ts";

import styles from "./file-browser.module.css";

const describeError = (caught: unknown): string =>
  caught instanceof Error ? caught.message : "Something went wrong";

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
  const [syncHistoryRefreshToken, setSyncHistoryRefreshToken] = useState<number>(0);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selection, setSelection] = useState<SelectionState>(initialSelectionState);
  const [lightboxEntryName, setLightboxEntryName] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      let movedCount = 0;
      let batchErrorMessage: string | null = null;

      for (const entry of entriesToMove) {
        const sourcePath = joinRelativePath(currentPath, entry.name);
        const destinationPath = joinRelativePath(targetDirectoryPath, entry.name);

        try {
          await api.moveEntry(sourcePath, destinationPath);
          movedCount += 1;
        } catch (caught) {
          batchErrorMessage = `Moved ${movedCount} of ${entriesToMove.length} before failing on "${entry.name}": ${describeError(caught)}`;
          break;
        }
      }

      // Refresh the listing before surfacing the outcome: loadDirectory
      // clears the error state on entry, so setting it beforehand would
      // have the refresh immediately wipe out a batch-move failure message.
      await loadDirectory(currentPath);

      if (batchErrorMessage) {
        setError(batchErrorMessage);
      } else {
        setSelection(initialSelectionState);
      }
    };

    performBatchMove();
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

  const sortedEntries = sortEntries(entries, sortCriterion, sortDirection);
  const groups = groupEntries(sortedEntries, groupCriterion);

  const previewableEntries = sortedEntries.filter(
    (entry) => entry.type === "file" && resolvePreviewSource(entry).kind !== "none",
  );
  const lightboxIndex =
    lightboxEntryName === null
      ? -1
      : previewableEntries.findIndex((entry) => entry.name === lightboxEntryName);
  const lightboxEntry = lightboxIndex === -1 ? null : previewableEntries[lightboxIndex];

  return (
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
          <Breadcrumbs
            currentPath={currentPath}
            onNavigate={navigateToPath}
            canDropOnPath={canDropOnDirectory}
            onDropEntry={handleDropOnDirectory}
          />
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
        <PanelDrawer>
          <JobProgress />
          <ConversionPanel onConverted={() => loadDirectory(currentPath)} />
          <SyncPanel
            onApplied={() => {
              loadDirectory(currentPath);
              setSyncHistoryRefreshToken((token) => token + 1);
            }}
          />
          <SyncHistoryPanel refreshToken={syncHistoryRefreshToken} />
          <ReconciliationPanel />
        </PanelDrawer>
      }
    />
  );
};
