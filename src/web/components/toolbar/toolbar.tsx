import {
  faArrowsRotate,
  faCloudArrowUp,
  faDiceD20,
  faEllipsisVertical,
  faHashtag,
  faScaleBalanced,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { type JSX, useState } from "react";

import { DirectoryActionsMenu } from "#components/directory-actions-menu/directory-actions-menu.tsx";
import { useContextMenu } from "#web/utils/use-context-menu.ts";

import styles from "./toolbar.module.css";

export interface ToolbarProps {
  busy: boolean;
  onCreateDirectory: (name: string) => void;
  onUploadFile: (file: File) => void;
  onRescan: (forceRehash: boolean) => void;
  onConvert: () => void;
  onSync: () => void;
  onReconcile: () => void;
  onFoundry: () => void;
  hasPendingFoundryMacro: boolean;
}

export const Toolbar = ({
  busy,
  onCreateDirectory,
  onUploadFile,
  onRescan,
  onConvert,
  onSync,
  onReconcile,
  onFoundry,
  hasPendingFoundryMacro,
}: ToolbarProps): JSX.Element => {
  const [forceRehash, setForceRehash] = useState<boolean>(false);
  const directoryActionsMenu = useContextMenu();

  return (
    <div className={clsx(styles.toolbar, busy && styles.busy)}>
      <div className={styles.contentActions}>
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
        <button type="button" disabled={busy} aria-label="Sync" title="Sync" onClick={onSync}>
          <FontAwesomeIcon icon={faCloudArrowUp} />
        </button>
        <button
          type="button"
          disabled={busy}
          aria-label="Reconcile"
          title="Reconcile"
          onClick={onReconcile}>
          <FontAwesomeIcon icon={faScaleBalanced} />
        </button>
        <button
          type="button"
          disabled={busy}
          aria-label="Foundry"
          title="Foundry"
          onClick={onFoundry}>
          <FontAwesomeIcon icon={faDiceD20} />
          {hasPendingFoundryMacro && (
            <span
              className={styles.pendingBadge}
              data-testid="foundry-pending-badge"
              aria-hidden="true"
            />
          )}
        </button>
        <button
          type="button"
          disabled={busy}
          aria-label="Directory actions"
          title="Directory actions"
          onClick={directoryActionsMenu.open}>
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </button>
        <DirectoryActionsMenu
          position={directoryActionsMenu.position}
          onClose={directoryActionsMenu.close}
          onCreateDirectory={onCreateDirectory}
          onUploadFile={onUploadFile}
          onConvert={onConvert}
        />
      </div>
    </div>
  );
};
