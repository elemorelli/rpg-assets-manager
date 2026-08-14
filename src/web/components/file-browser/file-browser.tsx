import { type JSX, useCallback, useEffect, useState } from "react";
import { Breadcrumbs } from "#components/breadcrumbs/breadcrumbs.tsx";
import { ConversionPanel } from "#components/conversion-panel/conversion-panel.tsx";
import { DirectoryTable } from "#components/directory-table/directory-table.tsx";
import { JobProgress } from "#components/job-progress/job-progress.tsx";
import { ReconciliationPanel } from "#components/reconciliation-panel/reconciliation-panel.tsx";
import { SearchBox } from "#components/search-box/search-box.tsx";
import { SearchResults } from "#components/search-results/search-results.tsx";
import { SyncHistoryPanel } from "#components/sync-history-panel/sync-history-panel.tsx";
import { SyncPanel } from "#components/sync-panel/sync-panel.tsx";
import { Toolbar } from "#components/toolbar/toolbar.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath, parentDirectory } from "#utils/paths.ts";
import type { SearchResultEntry } from "#web/requests/files/entry/search.ts";
import * as api from "#web/requests/index.ts";
import { isValidDropTarget } from "#web/utils/drag-drop.ts";
import styles from "./file-browser.module.css";

const describeError = (caught: unknown): string =>
  caught instanceof Error ? caught.message : "Something went wrong";

export interface FileBrowserProps {
  onLoggedOut: () => void;
}

export const FileBrowser = ({ onLoggedOut }: FileBrowserProps): JSX.Element => {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultEntry[] | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedEntry, setDraggedEntry] = useState<DirectoryEntry | null>(null);
  const [syncHistoryRefreshToken, setSyncHistoryRefreshToken] = useState<number>(0);

  const refresh = useCallback(async (path: string): Promise<void> => {
    setBusy(true);
    setError(null);
    setSearchResults(null);

    try {
      const listed = await api.listDirectory(path);

      setEntries(listed);
      setCurrentPath(path);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh("");
  }, [refresh]);

  const runAction = (action: () => Promise<void>): void => {
    setBusy(true);
    setError(null);

    action()
      .then(() => refresh(currentPath))
      .catch((caught: unknown) => {
        setError(describeError(caught));
        setBusy(false);
      });
  };

  const handleOpenDirectory = (name: string): void => {
    refresh(joinRelativePath(currentPath, name));
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

  const handleLogout = (): void => {
    api.logout().then(onLoggedOut);
  };

  const handleRename = (entry: DirectoryEntry): void => {
    const newName = window.prompt("New name", entry.name);

    if (!newName || newName === entry.name) {
      return;
    }

    runAction(() => api.renameEntry(joinRelativePath(currentPath, entry.name), newName));
  };

  const handleDelete = (entry: DirectoryEntry): void => {
    if (!window.confirm(`Delete ${entry.name}?`)) {
      return;
    }

    runAction(() => api.deleteEntry(joinRelativePath(currentPath, entry.name)));
  };

  const handleMove = (entry: DirectoryEntry): void => {
    const currentEntryPath = joinRelativePath(currentPath, entry.name);
    const destination = window.prompt(
      "Destination path (relative to asset tree root)",
      currentEntryPath,
    );

    if (!destination) {
      return;
    }

    runAction(() => api.moveEntry(currentEntryPath, destination));
  };

  const handleSearch = (query: string): void => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSearchResults(null);

      return;
    }

    api
      .searchEntries(trimmedQuery)
      .then(setSearchResults)
      .catch((caught: unknown) => setError(describeError(caught)));
  };

  const handleOpenSearchResult = (entry: SearchResultEntry): void => {
    const targetDirectory =
      entry.type === "directory" ? entry.relativePath : parentDirectory(entry.relativePath);

    refresh(targetDirectory);
  };

  const handleDragStart = (entry: DirectoryEntry): void => {
    setDraggedEntry(entry);
  };

  const handleDragEnd = (): void => {
    setDraggedEntry(null);
  };

  const canDropOnDirectory = (targetDirectoryPath: string): boolean => {
    if (!draggedEntry) {
      return false;
    }

    const sourceRelativePath = joinRelativePath(currentPath, draggedEntry.name);

    return isValidDropTarget(
      { relativePath: sourceRelativePath, type: draggedEntry.type },
      targetDirectoryPath,
    );
  };

  const handleDropOnDirectory = (targetDirectoryPath: string): void => {
    if (!draggedEntry || !canDropOnDirectory(targetDirectoryPath)) {
      setDraggedEntry(null);

      return;
    }

    const sourceRelativePath = joinRelativePath(currentPath, draggedEntry.name);
    const destination = joinRelativePath(targetDirectoryPath, draggedEntry.name);

    setDraggedEntry(null);
    runAction(() => api.moveEntry(sourceRelativePath, destination));
  };

  const canDropOnEntry = (targetEntry: DirectoryEntry): boolean =>
    targetEntry.type === "directory" &&
    canDropOnDirectory(joinRelativePath(currentPath, targetEntry.name));

  const handleDropOnEntry = (targetEntry: DirectoryEntry): void => {
    handleDropOnDirectory(joinRelativePath(currentPath, targetEntry.name));
  };

  return (
    <div className={styles.fileBrowser}>
      <Breadcrumbs
        currentPath={currentPath}
        onNavigate={(path) => refresh(path)}
        canDropOnPath={canDropOnDirectory}
        onDropEntry={handleDropOnDirectory}
      />
      <div className={styles.controls}>
        <Toolbar
          busy={busy}
          onCreateDirectory={handleCreateDirectory}
          onUploadFile={handleUploadFile}
          onRescan={handleRescan}
          onLogout={handleLogout}
        />
        <SearchBox onSearch={handleSearch} />
      </div>
      <JobProgress />
      <ConversionPanel onConverted={() => refresh(currentPath)} />
      <SyncPanel
        onApplied={() => {
          refresh(currentPath);
          setSyncHistoryRefreshToken((token) => token + 1);
        }}
      />
      <SyncHistoryPanel refreshToken={syncHistoryRefreshToken} />
      <ReconciliationPanel />
      {error && <p className={styles.error}>{error}</p>}
      {searchResults !== null ? (
        <SearchResults results={searchResults} onOpenResult={handleOpenSearchResult} />
      ) : (
        <DirectoryTable
          entries={entries}
          currentPath={currentPath}
          onOpenDirectory={handleOpenDirectory}
          onRename={handleRename}
          onDelete={handleDelete}
          onMove={handleMove}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          canDropEntry={canDropOnEntry}
          onDropEntry={handleDropOnEntry}
        />
      )}
    </div>
  );
};
