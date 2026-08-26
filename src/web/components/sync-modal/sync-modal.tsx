import { type JSX, useMemo, useState } from "react";

import { Button } from "#components/button/button.tsx";
import {
  type DiffFilterChipItem,
  DiffFilterChips,
} from "#components/diff-filter-chips/diff-filter-chips.tsx";
import { DiffTable } from "#components/diff-table/diff-table.tsx";
import { MessageBanner } from "#components/message-banner/message-banner.tsx";
import { Modal } from "#components/modal/modal.tsx";
import { ScopeSelector } from "#components/scope-selector/scope-selector.tsx";
import type { OperationScope } from "#utils/operation-scope.ts";
import type { BatchDiff } from "#web/requests/diff/fetch.ts";
import * as api from "#web/requests/index.ts";
import { buildSyncDiffRows, type DiffRowKind, filterRowsByKind } from "#web/utils/diff-rows.ts";
import { describeScopedTitle } from "#web/utils/scope-title.ts";
import { useBusyAction } from "#web/utils/use-busy-action.ts";
import { useFetchOnMount } from "#web/utils/use-fetch-on-mount.ts";

import styles from "./sync-modal.module.css";

export interface SyncModalProps {
  currentPath: string;
  onClose: () => void;
  onApplied: () => void;
}

export const SyncModal = ({ currentPath, onClose, onApplied }: SyncModalProps): JSX.Element => {
  const [scope, setScope] = useState<OperationScope>("folder");
  const directoryLabel = currentPath === "" ? "root" : currentPath;

  const {
    data: diff,
    message,
    setMessage,
  } = useFetchOnMount<BatchDiff>(() => api.fetchDiff(currentPath, scope), [currentPath, scope]);
  const { busy, runBusyAction } = useBusyAction(setMessage);
  const [hiddenKinds, setHiddenKinds] = useState<ReadonlySet<DiffRowKind>>(new Set());

  const toggleKind = (kind: DiffRowKind): void => {
    setHiddenKinds((current) => {
      const next = new Set(current);

      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }

      return next;
    });
  };

  const changeRows = useMemo(() => (diff ? buildSyncDiffRows(diff) : []), [diff]);
  const visibleChangeRows = useMemo(
    () => filterRowsByKind(changeRows, hiddenKinds),
    [changeRows, hiddenKinds],
  );

  const filterItems: DiffFilterChipItem<DiffRowKind>[] = diff
    ? [
        { id: "added", label: "added", count: diff.added.length, colorClassName: styles.added },
        {
          id: "modified",
          label: "modified",
          count: diff.modified.length,
          colorClassName: styles.modified,
        },
        {
          id: "removed",
          label: "deleted",
          count: diff.deleted.length,
          colorClassName: styles.deleted,
        },
        {
          id: "renamed",
          label: "renamed",
          count: diff.renamed.length,
          colorClassName: styles.renamed,
        },
      ]
    : [];

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
          <DiffFilterChips items={filterItems} hiddenIds={hiddenKinds} onToggle={toggleKind} />
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
          <DiffTable rows={visibleChangeRows} />
        </div>
      )}
    </Modal>
  );
};
