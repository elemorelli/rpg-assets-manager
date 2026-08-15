import clsx from "clsx";
import { type ChangeEvent, type JSX, useRef, useState } from "react";

import styles from "./toolbar.module.css";

export interface ToolbarProps {
  busy: boolean;
  onCreateDirectory: (name: string) => void;
  onUploadFile: (file: File) => void;
  onRescan: (forceRehash: boolean) => void;
  onLogout: () => void;
}

export const Toolbar = ({
  busy,
  onCreateDirectory,
  onUploadFile,
  onRescan,
  onLogout,
}: ToolbarProps): JSX.Element => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [forceRehash, setForceRehash] = useState<boolean>(false);

  const handleCreateDirectoryClick = (): void => {
    const name = window.prompt("New folder name");

    if (name) {
      onCreateDirectory(name);
    }
  };

  const handleUploadClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];

    if (file) {
      onUploadFile(file);
    }

    event.target.value = "";
  };

  return (
    <div className={clsx(styles.toolbar, busy && styles.busy)}>
      <button type="button" disabled={busy} onClick={handleCreateDirectoryClick}>
        New folder
      </button>
      <button type="button" disabled={busy} onClick={handleUploadClick}>
        Upload file
      </button>
      <button type="button" disabled={busy} onClick={() => onRescan(forceRehash)}>
        Rescan
      </button>
      <label className={styles.rehashLabel}>
        <input
          type="checkbox"
          checked={forceRehash}
          disabled={busy}
          onChange={(event) => setForceRehash(event.target.checked)}
        />
        Full rehash
      </label>
      <input
        ref={fileInputRef}
        type="file"
        className={styles.hiddenInput}
        onChange={handleFileSelected}
      />
      <button type="button" disabled={busy} onClick={onLogout}>
        Log out
      </button>
    </div>
  );
};
