import { type JSX, useMemo, useState } from "react";

import { Button } from "#components/button/button.tsx";
import { MessageBanner } from "#components/message-banner/message-banner.tsx";
import { Modal } from "#components/modal/modal.tsx";
import { ScopeSelector } from "#components/scope-selector/scope-selector.tsx";
import { ScrollList, type ScrollListRow } from "#components/scroll-list/scroll-list.tsx";
import type { OperationScope } from "#utils/operation-scope.ts";
import type { BatchDiff } from "#web/requests/diff/fetch.ts";
import * as api from "#web/requests/index.ts";
import { describeScopedTitle } from "#web/utils/scope-title.ts";
import { useBusyAction } from "#web/utils/use-busy-action.ts";
import { useFetchOnMount } from "#web/utils/use-fetch-on-mount.ts";

import styles from "./sync-modal.module.css";

export interface SyncModalProps {
  currentPath: string;
  onClose: () => void;
  onApplied: () => void;
}

const buildChangeRows = (diff: BatchDiff): ScrollListRow[] => [
  ...diff.added.map((relativePath) => ({
    key: `added:${relativePath}`,
    label: `+ ${relativePath}`,
    className: styles.added,
  })),
  ...diff.modified.map((relativePath) => ({
    key: `modified:${relativePath}`,
    label: `~ ${relativePath}`,
    className: styles.modified,
  })),
  ...diff.deleted.map((relativePath) => ({
    key: `deleted:${relativePath}`,
    label: `- ${relativePath}`,
    className: styles.deleted,
  })),
  ...diff.renamed.map((pair) => ({
    key: `renamed:${pair.oldPath}`,
    label: `${pair.oldPath}\n-> ${pair.newPath}`,
    className: styles.renamed,
  })),
];

export const SyncModal = ({ currentPath, onClose, onApplied }: SyncModalProps): JSX.Element => {
  const [scope, setScope] = useState<OperationScope>("folder");
  const directoryLabel = currentPath === "" ? "root" : currentPath;

  const {
    data: diff,
    message,
    setMessage,
  } = useFetchOnMount<BatchDiff>(() => api.fetchDiff(currentPath, scope), [currentPath, scope]);
  const { busy, runBusyAction } = useBusyAction(setMessage);

  const changeRows = useMemo(() => (diff ? buildChangeRows(diff) : []), [diff]);

  const handleApply = (): void => {
    runBusyAction(() =>
      api.applyBatch(currentPath, scope).then(() => {
        onApplied();
        onClose();
      }),
    );
  };

  const hasNothingToSync =
    diff !== null &&
    diff.added.length === 0 &&
    diff.modified.length === 0 &&
    diff.deleted.length === 0 &&
    diff.renamed.length === 0;

  const footer =
    diff && !hasNothingToSync ? (
      <>
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={busy} onClick={handleApply}>
          Apply changes
        </Button>
      </>
    ) : (
      <Button variant="secondary" disabled={busy} onClick={onClose}>
        Close
      </Button>
    );

  return (
    <Modal
      title={describeScopedTitle("Sync changes", scope, directoryLabel)}
      onClose={onClose}
      footer={footer}>
      <ScopeSelector scope={scope} onScopeChange={setScope} directoryLabel={directoryLabel} />
      {message && <MessageBanner message={message} />}
      {!diff && !message && <p>Checking for changes...</p>}
      {hasNothingToSync && <p>Nothing to sync.</p>}
      {diff && !hasNothingToSync && (
        <div className={styles.section}>
          <p className={styles.summary}>
            <span className={styles.added}>{`${diff.added.length} added`}</span>
            {", "}
            <span className={styles.modified}>{`${diff.modified.length} modified`}</span>
            {", "}
            <span className={styles.deleted}>{`${diff.deleted.length} deleted`}</span>
            {", "}
            <span className={styles.renamed}>{`${diff.renamed.length} renamed`}</span>
          </p>
          {diff.ambiguousWarnings.length > 0 && (
            <div className={styles.section}>
              <p>Ambiguous renames (resolved as delete plus add):</p>
              <ul className={styles.list}>
                {diff.ambiguousWarnings.map((warning) => (
                  <li key={warning.hash}>
                    {`${warning.localPaths.join(", ")} <-> ${warning.remotePaths.join(", ")}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ScrollList rows={changeRows} />
        </div>
      )}
    </Modal>
  );
};
