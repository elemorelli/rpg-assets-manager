import clsx from "clsx";
import { type ChangeEvent, type JSX, useRef } from "react";
import styles from "./toolbar.module.css";

export interface ToolbarProps {
  busy: boolean;
  onCreateDirectory: (name: string) => void;
  onUploadFile: (file: File) => void;
  onRescan: () => void;
}

export const Toolbar = ({
  busy,
  onCreateDirectory,
  onUploadFile,
  onRescan,
}: ToolbarProps): JSX.Element => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <button type="button" disabled={busy} onClick={onRescan}>
        Rescan
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className={styles.hiddenInput}
        onChange={handleFileSelected}
      />
    </div>
  );
};
