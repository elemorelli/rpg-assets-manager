import { type JSX, useCallback, useEffect, useState } from "react";
import type { DirectoryEntry } from "../../../core/directoryListing.ts";
import * as api from "../../api.ts";
import { Breadcrumbs } from "../Breadcrumbs/Breadcrumbs.tsx";
import { DirectoryTable } from "../DirectoryTable/DirectoryTable.tsx";
import { Toolbar } from "../Toolbar/Toolbar.tsx";
import styles from "./FileBrowser.module.css";

const joinPath = (base: string, name: string): string => (base ? `${base}/${name}` : name);

const describeError = (caught: unknown): string =>
  caught instanceof Error ? caught.message : "Something went wrong";

export const FileBrowser = (): JSX.Element => {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (path: string): Promise<void> => {
    setBusy(true);
    setError(null);

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
    refresh(joinPath(currentPath, name));
  };

  const handleCreateDirectory = (name: string): void => {
    runAction(() => api.createDirectory(joinPath(currentPath, name)));
  };

  const handleUploadFile = (file: File): void => {
    runAction(() => api.uploadFile(currentPath, file));
  };

  const handleRename = (entry: DirectoryEntry): void => {
    const newName = window.prompt("New name", entry.name);

    if (!newName || newName === entry.name) {
      return;
    }

    runAction(() => api.renameEntry(joinPath(currentPath, entry.name), newName));
  };

  const handleDelete = (entry: DirectoryEntry): void => {
    if (!window.confirm(`Delete ${entry.name}?`)) {
      return;
    }

    runAction(() => api.deleteEntry(joinPath(currentPath, entry.name)));
  };

  const handleMove = (entry: DirectoryEntry): void => {
    const currentEntryPath = joinPath(currentPath, entry.name);
    const destination = window.prompt(
      "Destination path (relative to asset tree root)",
      currentEntryPath,
    );

    if (!destination) {
      return;
    }

    runAction(() => api.moveEntry(currentEntryPath, destination));
  };

  return (
    <div className={styles.fileBrowser}>
      <Breadcrumbs currentPath={currentPath} onNavigate={(path) => refresh(path)} />
      <Toolbar
        busy={busy}
        onCreateDirectory={handleCreateDirectory}
        onUploadFile={handleUploadFile}
      />
      {error && <p className={styles.error}>{error}</p>}
      <DirectoryTable
        entries={entries}
        onOpenDirectory={handleOpenDirectory}
        onRename={handleRename}
        onDelete={handleDelete}
        onMove={handleMove}
      />
    </div>
  );
};
