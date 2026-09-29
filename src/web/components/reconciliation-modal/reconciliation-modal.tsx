import { type JSX, useMemo, useState } from "react";

import { Button } from "#components/button/button.tsx";
import { CancelJobButton } from "#components/cancel-job-button/cancel-job-button.tsx";
import {
  type DiffFilterChipItem,
  DiffFilterChips,
} from "#components/diff-filter-chips/diff-filter-chips.tsx";
import { DiffTable } from "#components/diff-table/diff-table.tsx";
import { JobProgressBar } from "#components/job-progress-bar/job-progress-bar.tsx";
import { MessageBanner } from "#components/message-banner/message-banner.tsx";
import { Modal } from "#components/modal/modal.tsx";
import type { JobType } from "#utils/job.ts";
import type { RcloneCheckResult } from "#utils/reconcile.ts";
import * as api from "#web/requests/index.ts";
import {
  buildReconcileDiffRows,
  type DiffRowKind,
  filterRowsByKind,
} from "#web/utils/diff-rows.ts";
import { computeEtaSeconds } from "#web/utils/job-eta.ts";
import { toggleSetMember } from "#web/utils/toggle-set-member.ts";
import { useFetchOnMount } from "#web/utils/use-fetch-on-mount.ts";
import { useJobStream } from "#web/utils/use-job-stream.ts";

import styles from "./reconciliation-modal.module.css";

const RECONCILE_JOB_TYPE: JobType = "reconcile";

type ReconcileFilterId = DiffRowKind | "error";

export interface ReconciliationModalProps {
  onClose: () => void;
}

export const ReconciliationModal = ({ onClose }: ReconciliationModalProps): JSX.Element => {
  const { data: result, message } = useFetchOnMount<RcloneCheckResult>(() => api.reconcile(), []);
  const [jobState] = useJobStream();
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<ReconcileFilterId>>(new Set());

  const toggleId = (id: ReconcileFilterId): void => {
    setHiddenIds((current) => toggleSetMember(current, id));
  };

  const resultRows = useMemo(() => (result ? buildReconcileDiffRows(result) : []), [result]);
  const visibleResultRows = useMemo(
    () => filterRowsByKind(resultRows, hiddenIds),
    [resultRows, hiddenIds],
  );
  const areErrorsHidden = hiddenIds.has("error");

  const isRunning = jobState.kind === "running" && jobState.type === RECONCILE_JOB_TYPE;
  const isCancelled = jobState.kind === "cancelled" && jobState.type === RECONCILE_JOB_TYPE;
  const showsCheckResult = !isRunning && !isCancelled;

  const hasNoDifferences =
    result !== null &&
    result.missingOnDestination.length === 0 &&
    result.missingOnSource.length === 0 &&
    result.differs.length === 0 &&
    result.errors.length === 0;

  const footer = isRunning ? (
    <CancelJobButton />
  ) : (
    <Button variant="secondary" onClick={onClose}>
      Close
    </Button>
  );

  return (
    <Modal title="Reconcile with R2" onClose={onClose} footer={footer} dismissible={!isRunning}>
      {isRunning && (
        <JobProgressBar
          done={jobState.done}
          total={jobState.total}
          detail={jobState.detail}
          etaSeconds={computeEtaSeconds(
            jobState.done,
            jobState.total,
            jobState.startedAt,
            Date.now(),
          )}
        />
      )}
      {!isRunning && isCancelled && <p>Reconcile cancelled.</p>}
      {showsCheckResult && message && <MessageBanner message={message} />}
      {showsCheckResult && !result && !message && <p>Checking for differences...</p>}
      {showsCheckResult && hasNoDifferences && (
        <p>{`${result.matchCount} file(s) match. No differences found.`}</p>
      )}
      {showsCheckResult && result && !hasNoDifferences && (
        <div className={styles.section}>
          <p className={styles.summary}>{`${result.matchCount} file(s) match.`}</p>
          <DiffFilterChips<ReconcileFilterId>
            items={[
              {
                id: "removed",
                label: "missing on destination",
                count: result.missingOnDestination.length,
                colorClassName: styles.missingDestination,
              },
              {
                id: "added",
                label: "missing on source",
                count: result.missingOnSource.length,
                colorClassName: styles.missingSource,
              },
              {
                id: "modified",
                label: "differ",
                count: result.differs.length,
                colorClassName: styles.differs,
              },
              {
                id: "error",
                label: "errored",
                count: result.errors.length,
                colorClassName: styles.erroredPath,
              },
            ]}
            hiddenIds={hiddenIds}
            onToggle={toggleId}
          />
          <DiffTable rows={visibleResultRows} beforeLabel="Source" afterLabel="Destination" />
          {!areErrorsHidden && result.errors.length > 0 && (
            <div className={styles.section}>
              <p>Errors:</p>
              <ul className={styles.list}>
                {result.errors.map((relativePath) => (
                  <li key={relativePath} className={styles.erroredPath}>
                    {relativePath}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
