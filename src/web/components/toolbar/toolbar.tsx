import {
  faArrowsRotate,
  faCloudArrowUp,
  faDiceD20,
  faEllipsisVertical,
  faFileExport,
  faHashtag,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { type JSX, useState } from "react";

import { ConfirmDialog } from "#components/confirm-dialog/confirm-dialog.tsx";
import { DirectoryActionsMenu } from "#components/directory-actions-menu/directory-actions-menu.tsx";
import { SegmentedButton } from "#components/segmented-group/segmented-button.tsx";
import { SegmentedGroup } from "#components/segmented-group/segmented-group.tsx";
import { useContextMenu } from "#web/utils/use-context-menu.ts";

import { PendingBadge } from "./pending-badge.tsx";
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
  hasPendingSyncChanges: boolean;
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
  hasPendingSyncChanges,
}: ToolbarProps): JSX.Element => {
  const [confirmingRehash, setConfirmingRehash] = useState<boolean>(false);
  const directoryActionsMenu = useContextMenu();

  const handleConfirmRehash = (): void => {
    setConfirmingRehash(false);
    onRescan(true);
  };

  return (
    <div className={clsx(styles.toolbar, busy && styles.busy)}>
      <SegmentedGroup aria-label="Content actions">
        <SegmentedButton
          disabled={busy}
          aria-label="Rescan"
          title="Rescan"
          onClick={() => onRescan(false)}>
          <FontAwesomeIcon icon={faArrowsRotate} />
        </SegmentedButton>
        <SegmentedButton disabled={busy} aria-label="Convert" title="Convert" onClick={onConvert}>
          <FontAwesomeIcon icon={faFileExport} />
        </SegmentedButton>
        <SegmentedButton disabled={busy} aria-label="Sync" title="Sync" onClick={onSync}>
          <FontAwesomeIcon icon={faCloudArrowUp} />
          {hasPendingSyncChanges && <PendingBadge testId="sync-pending-badge" />}
        </SegmentedButton>
        <SegmentedButton disabled={busy} aria-label="Foundry" title="Foundry" onClick={onFoundry}>
          <FontAwesomeIcon icon={faDiceD20} />
          {hasPendingFoundryMacro && <PendingBadge testId="foundry-pending-badge" />}
        </SegmentedButton>
        <SegmentedButton
          disabled={busy}
          aria-label="Directory actions"
          title="Directory actions"
          onClick={directoryActionsMenu.open}>
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </SegmentedButton>
        <DirectoryActionsMenu
          position={directoryActionsMenu.position}
          onClose={directoryActionsMenu.close}
          onCreateDirectory={onCreateDirectory}
          onUploadFile={onUploadFile}
          onRehashRequested={() => setConfirmingRehash(true)}
          onReconcile={onReconcile}
        />
      </SegmentedGroup>
      {confirmingRehash && (
        <ConfirmDialog
          title="Full rehash"
          icon={faHashtag}
          message="This re-reads and re-hashes every file in the collection, even the ones that haven't changed. It can take a while for large collections. Continue?"
          confirmLabel="Rehash"
          onConfirm={handleConfirmRehash}
          onCancel={() => setConfirmingRehash(false)}
        />
      )}
    </div>
  );
};
