import { type JSX, useCallback, useEffect, useState } from "react";
import type { DirectoryEntry } from "../../../core/directoryListing.ts";
import { isValidDropTarget } from "../../../core/dragDrop.ts";
import { joinRelativePath, parentDirectory } from "../../../core/paths.ts";
import * as api from "../../requests/index.ts";
import type { SearchResultEntry } from "../../requests/searchEntries.ts";
import { Breadcrumbs } from "../Breadcrumbs/Breadcrumbs.tsx";
import { DirectoryTable } from "../DirectoryTable/DirectoryTable.tsx";
import { SearchBox } from "../SearchBox/SearchBox.tsx";
import { SearchResults } from "../SearchResults/SearchResults.tsx";
import { Toolbar } from "../Toolbar/Toolbar.tsx";
import styles from "./FileBrowser.module.css";

const describeError = (caught: unknown): string =>
  caught instanceof Error ? caught.message : "Something went wrong";

export const FileBrowser = (): JSX.Element => {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultEntry[] | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedEntry, setDraggedEntry] = useState<DirectoryEntry | null>(null);

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
        />
        <SearchBox onSearch={handleSearch} />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {searchResults !== null ? (
        <SearchResults results={searchResults} onOpenResult={handleOpenSearchResult} />
      ) : (
        <DirectoryTable
          entries={entries}
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
