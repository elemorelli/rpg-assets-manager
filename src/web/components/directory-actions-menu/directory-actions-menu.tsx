import {
  faFileExport,
  faFolderPlus,
  faHashtag,
  faScaleBalanced,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type ChangeEvent, type JSX, useRef } from "react";

import { ContextMenu } from "#components/context-menu/context-menu.tsx";
import { MenuItem } from "#components/context-menu/menu-item.tsx";
import { MenuList } from "#components/context-menu/menu-list.tsx";

import styles from "./directory-actions-menu.module.css";

export interface DirectoryActionsMenuProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
  onCreateDirectory: (name: string) => void;
  onUploadFile: (file: File) => void;
  onConvert?: () => void;
  onRehashRequested?: () => void;
  onReconcile?: () => void;
}

export const DirectoryActionsMenu = ({
  position,
  onClose,
  onCreateDirectory,
  onUploadFile,
  onConvert,
  onRehashRequested,
  onReconcile,
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
    onConvert?.();
    onClose();
  };

  const handleRehashClick = (): void => {
    onRehashRequested?.();
    onClose();
  };

  const handleReconcileClick = (): void => {
    onReconcile?.();
    onClose();
  };

  return (
    <ContextMenu position={position} onClose={onClose}>
      <MenuList>
        <MenuItem onClick={handleCreateDirectoryClick}>
          <FontAwesomeIcon icon={faFolderPlus} fixedWidth />
          New directory
        </MenuItem>
        <MenuItem onClick={handleUploadClick}>
          <FontAwesomeIcon icon={faUpload} fixedWidth />
          Upload file
        </MenuItem>
        {onConvert && (
          <MenuItem onClick={handleConvertClick}>
            <FontAwesomeIcon icon={faFileExport} fixedWidth />
            Convert
          </MenuItem>
        )}
        {onRehashRequested && (
          <MenuItem onClick={handleRehashClick}>
            <FontAwesomeIcon icon={faHashtag} fixedWidth />
            Full rehash
          </MenuItem>
        )}
        {onReconcile && (
          <MenuItem onClick={handleReconcileClick}>
            <FontAwesomeIcon icon={faScaleBalanced} fixedWidth />
            Reconcile
          </MenuItem>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className={styles.hiddenInput}
          onChange={handleFileSelected}
        />
      </MenuList>
    </ContextMenu>
  );
};
