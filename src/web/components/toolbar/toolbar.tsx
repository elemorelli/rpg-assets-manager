import {
  faArrowsRotate,
  faFolderPlus,
  faHashtag,
  faRightLeft,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { type ChangeEvent, type JSX, useRef, useState } from "react";

import styles from "./toolbar.module.css";

export interface ToolbarProps {
  busy: boolean;
  onCreateDirectory: (name: string) => void;
  onUploadFile: (file: File) => void;
  onRescan: (forceRehash: boolean) => void;
  onConvert: () => void;
}

export const Toolbar = ({
  busy,
  onCreateDirectory,
  onUploadFile,
  onRescan,
  onConvert,
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
      <div className={styles.contentActions}>
        <button
          type="button"
          disabled={busy}
          aria-label="New folder"
          title="New folder"
          onClick={handleCreateDirectoryClick}>
          <FontAwesomeIcon icon={faFolderPlus} />
        </button>
        <button
          type="button"
          disabled={busy}
          aria-label="Upload file"
          title="Upload file"
          onClick={handleUploadClick}>
          <FontAwesomeIcon icon={faUpload} />
        </button>
        <button
          type="button"
          disabled={busy}
          aria-label="Rescan"
          title="Rescan"
          onClick={() => onRescan(forceRehash)}>
          <FontAwesomeIcon icon={faArrowsRotate} />
        </button>
        <button
          type="button"
          disabled={busy}
          aria-label="Full rehash"
          title="Full rehash"
          aria-pressed={forceRehash}
          className={clsx(forceRehash && styles.toggleActive)}
          onClick={() => setForceRehash((current) => !current)}>
          <FontAwesomeIcon icon={faHashtag} />
        </button>
        <button
          type="button"
          disabled={busy}
          aria-label="Convert"
          title="Convert"
          onClick={onConvert}>
          <FontAwesomeIcon icon={faRightLeft} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className={styles.hiddenInput}
          onChange={handleFileSelected}
        />
      </div>
    </div>
  );
};
