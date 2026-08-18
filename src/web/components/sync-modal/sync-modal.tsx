import { useVirtualizer } from "@tanstack/react-virtual";
import { type JSX, useEffect, useMemo, useRef, useState } from "react";

import { Modal } from "#components/modal/modal.tsx";
import type { BatchDiff } from "#web/requests/diff/fetch.ts";
import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";

import styles from "./sync-modal.module.css";

export interface SyncModalProps {
  onClose: () => void;
  onApplied: () => void;
}

interface ChangeRow {
  key: string;
  label: string;
}

const ROW_HEIGHT_PX = 28;
const LIST_HEIGHT_PX = 300;

const buildChangeRows = (diff: BatchDiff): ChangeRow[] => [
  ...diff.added.map((relativePath) => ({
    key: `added:${relativePath}`,
    label: `+ ${relativePath}`,
  })),
  ...diff.modified.map((relativePath) => ({
    key: `modified:${relativePath}`,
    label: `~ ${relativePath}`,
  })),
  ...diff.deleted.map((relativePath) => ({
    key: `deleted:${relativePath}`,
    label: `- ${relativePath}`,
  })),
  ...diff.renamed.map((pair) => ({
    key: `renamed:${pair.oldPath}`,
    label: `${pair.oldPath} -> ${pair.newPath}`,
  })),
];

export const SyncModal = ({ onClose, onApplied }: SyncModalProps): JSX.Element => {
  const [diff, setDiff] = useState<BatchDiff | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .fetchDiff()
      .then(setDiff)
      .catch((caught: unknown) => setError(describeError(caught)));
  }, []);

  const changeRows = useMemo(() => (diff ? buildChangeRows(diff) : []), [diff]);

  const virtualizer = useVirtualizer({
    count: changeRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
  });

  const handleApply = (): void => {
    setBusy(true);
    setError(null);

    api
      .applyBatch()
      .then(() => {
        onApplied();
        onClose();
      })
      .catch((caught: unknown) => setError(describeError(caught)))
      .finally(() => setBusy(false));
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
          <p>
            {`${diff.added.length} added, ${diff.modified.length} modified, ${diff.deleted.length} deleted, ${diff.renamed.length} renamed`}
          </p>
          {diff.deleted.length > 0 && (
            <div className={styles.section}>
              <p>Deletions:</p>
              <ul className={styles.list}>
                {diff.deleted.map((relativePath) => (
                  <li key={relativePath}>{relativePath}</li>
                ))}
              </ul>
            </div>
          )}
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
          <div
            ref={scrollContainerRef}
            className={styles.virtualList}
            style={{ height: LIST_HEIGHT_PX }}>
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => (
                <div
                  key={changeRows[virtualRow.index].key}
                  className={styles.row}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}>
                  {changeRows[virtualRow.index].label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
