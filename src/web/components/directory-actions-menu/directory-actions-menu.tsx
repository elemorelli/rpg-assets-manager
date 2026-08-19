import { type ChangeEvent, type JSX, useRef } from "react";

import { ContextMenu } from "#components/context-menu/context-menu.tsx";

import styles from "./directory-actions-menu.module.css";

export interface DirectoryActionsMenuProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
  onCreateDirectory: (name: string) => void;
  onUploadFile: (file: File) => void;
  onConvert: () => void;
}

export const DirectoryActionsMenu = ({
  position,
  onClose,
  onCreateDirectory,
  onUploadFile,
  onConvert,
}: DirectoryActionsMenuProps): JSX.Element => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateDirectoryClick = (): void => {
    const name = window.prompt("New directory name");

    if (name) {
      onCreateDirectory(name);
    }

    onClose();
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
    onClose();
  };

  const handleConvertClick = (): void => {
    onConvert();
    onClose();
  };

  return (
    <ContextMenu position={position} onClose={onClose}>
      <div className={styles.items}>
        <button type="button" className={styles.item} onClick={handleCreateDirectoryClick}>
          New directory
        </button>
        <button type="button" className={styles.item} onClick={handleUploadClick}>
          Upload file
        </button>
        <button type="button" className={styles.item} onClick={handleConvertClick}>
          Convert
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className={styles.hiddenInput}
          onChange={handleFileSelected}
        />
      </div>
    </ContextMenu>
  );
};
