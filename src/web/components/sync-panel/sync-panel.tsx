import { useVirtualizer } from "@tanstack/react-virtual";
import { type JSX, useMemo, useRef, useState } from "react";

import type { BatchDiff } from "#web/requests/diff/fetch.ts";
import * as api from "#web/requests/index.ts";

import styles from "./sync-panel.module.css";

export interface SyncPanelProps {
  onApplied: () => void;
}

interface ChangeRow {
  key: string;
  label: string;
}

const ROW_HEIGHT_PX = 28;
const LIST_HEIGHT_PX = 300;

const describeError = (caught: unknown): string =>
  caught instanceof Error ? caught.message : "Something went wrong";

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

export const SyncPanel = ({ onApplied }: SyncPanelProps): JSX.Element => {
  const [diff, setDiff] = useState<BatchDiff | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const changeRows = useMemo(() => (diff ? buildChangeRows(diff) : []), [diff]);

  const virtualizer = useVirtualizer({
    count: changeRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
  });

  const handleCheck = (): void => {
    setBusy(true);
    setError(null);

    api
      .fetchDiff()
      .then(setDiff)
      .catch((caught: unknown) => setError(describeError(caught)))
      .finally(() => setBusy(false));
  };

  const handleApply = (): void => {
    setBusy(true);
    setError(null);

    api
      .applyBatch()
      .then(() => {
        setDiff(null);
        onApplied();
      })
      .catch((caught: unknown) => setError(describeError(caught)))
      .finally(() => setBusy(false));
  };

  const hasNoChanges =
    diff !== null &&
    diff.added.length === 0 &&
    diff.modified.length === 0 &&
    diff.deleted.length === 0 &&
    diff.renamed.length === 0;

  return (
    <div className={styles.panel}>
      <button type="button" disabled={busy} onClick={handleCheck}>
        Check for changes
      </button>
      {error && <p className={styles.error}>{error}</p>}
      {hasNoChanges && <p>Nothing to sync.</p>}
      {diff && !hasNoChanges && (
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
          <button type="button" disabled={busy} onClick={handleApply}>
            Apply changes
          </button>
        </div>
      )}
    </div>
  );
};
