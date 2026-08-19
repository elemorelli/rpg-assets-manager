import { type JSX, useMemo } from "react";

import { Modal } from "#components/modal/modal.tsx";
import { ScrollList, type ScrollListRow } from "#components/scroll-list/scroll-list.tsx";
import type { BatchDiff } from "#web/requests/diff/fetch.ts";
import * as api from "#web/requests/index.ts";
import { useBusyAction } from "#web/utils/use-busy-action.ts";
import { useFetchOnMount } from "#web/utils/use-fetch-on-mount.ts";

import styles from "./sync-modal.module.css";

export interface SyncModalProps {
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

export const SyncModal = ({ onClose, onApplied }: SyncModalProps): JSX.Element => {
  const { data: diff, error, setError } = useFetchOnMount<BatchDiff>(() => api.fetchDiff(), []);
  const { busy, runBusyAction } = useBusyAction(setError);

  const changeRows = useMemo(() => (diff ? buildChangeRows(diff) : []), [diff]);

  const handleApply = (): void => {
    runBusyAction(() =>
      api.applyBatch().then(() => {
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
        <button type="button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button type="button" disabled={busy} onClick={handleApply}>
          Apply changes
        </button>
      </>
    ) : (
      <button type="button" disabled={busy} onClick={onClose}>
        Close
      </button>
    );

  return (
    <Modal title="Sync changes" onClose={onClose} footer={footer}>
      {error && <p className={styles.error}>{error}</p>}
      {!diff && !error && <p>Checking for changes...</p>}
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
