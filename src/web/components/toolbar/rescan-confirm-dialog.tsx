import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons";
import { type JSX, useState } from "react";

import { ConfirmDialog } from "#components/confirm-dialog/confirm-dialog.tsx";
import type { RescanRequest } from "#utils/rescan.ts";

import styles from "./toolbar.module.css";

export interface RescanConfirmDialogProps {
  onConfirm: (request: RescanRequest) => void;
  onCancel: () => void;
}

export const RescanConfirmDialog = ({
  onConfirm,
  onCancel,
}: RescanConfirmDialogProps): JSX.Element => {
  const [removeEmptyFolders, setRemoveEmptyFolders] = useState<boolean>(false);

  const message = (
    <div className={styles.rescanMessage}>
      <span>
        Rescan the collection for new, changed, or removed files. This can take a while for large
        collections. Continue?
      </span>
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={removeEmptyFolders}
          onChange={(event) => setRemoveEmptyFolders(event.target.checked)}
        />
        Also remove empty folders
      </label>
    </div>
  );

  return (
    <ConfirmDialog
      title="Rescan"
      icon={faArrowsRotate}
      message={message}
      confirmLabel="Rescan now"
      onConfirm={() => onConfirm({ removeEmptyFolders })}
      onCancel={onCancel}
    />
  );
};
