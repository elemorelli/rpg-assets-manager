import { type JSX, useMemo, useState } from "react";

import { Button } from "#components/button/button.tsx";
import { JobProgressBar } from "#components/job-progress-bar/job-progress-bar.tsx";
import { MessageBanner } from "#components/message-banner/message-banner.tsx";
import { Modal } from "#components/modal/modal.tsx";
import { ScrollList, type ScrollListRow } from "#components/scroll-list/scroll-list.tsx";
import * as api from "#web/requests/index.ts";
import type { RcloneCheckResult } from "#web/requests/reconcile/check.ts";
import { computeEtaSeconds } from "#web/utils/job-eta.ts";
import { useFetchOnMount } from "#web/utils/use-fetch-on-mount.ts";
import { useJobStream } from "#web/utils/use-job-stream.ts";

import styles from "./reconciliation-modal.module.css";

const RECONCILE_JOB_TYPE = "reconcile";

export interface ReconciliationModalProps {
  onClose: () => void;
}

const buildResultRows = (result: RcloneCheckResult): ScrollListRow[] => [
  ...result.missingOnDestination.map((relativePath) => ({
    key: `missing-destination:${relativePath}`,
    label: `> ${relativePath}`,
    className: styles.missingDestination,
  })),
  ...result.missingOnSource.map((relativePath) => ({
    key: `missing-source:${relativePath}`,
    label: `< ${relativePath}`,
    className: styles.missingSource,
  })),
  ...result.differs.map((relativePath) => ({
    key: `differs:${relativePath}`,
    label: `~ ${relativePath}`,
    className: styles.differs,
  })),
  ...result.errors.map((relativePath) => ({
    key: `error:${relativePath}`,
    label: `! ${relativePath}`,
    className: styles.erroredPath,
  })),
];

export const ReconciliationModal = ({ onClose }: ReconciliationModalProps): JSX.Element => {
  const { data: result, message } = useFetchOnMount<RcloneCheckResult>(() => api.reconcile(), []);
  const [jobState] = useJobStream();
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const resultRows = useMemo(() => (result ? buildResultRows(result) : []), [result]);

  const isRunning = jobState.kind === "running" && jobState.type === RECONCILE_JOB_TYPE;
  const isCancelled = jobState.kind === "cancelled" && jobState.type === RECONCILE_JOB_TYPE;

  const hasNoDifferences =
    result !== null &&
    result.missingOnDestination.length === 0 &&
    result.missingOnSource.length === 0 &&
    result.differs.length === 0 &&
    result.errors.length === 0;

  const handleCancel = (): void => {
    setIsCancelling(true);
    api
      .cancelJob()
      .catch(() => {})
      .finally(() => setIsCancelling(false));
  };

  const footer = isRunning ? (
    <Button variant="secondary" onClick={handleCancel} disabled={isCancelling}>
      {isCancelling ? "Cancelling…" : "Cancel"}
    </Button>
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
          etaSeconds={
            jobState.indeterminate
              ? null
              : computeEtaSeconds(jobState.done, jobState.total, jobState.startedAt, Date.now())
          }
        />
      )}
      {!isRunning && isCancelled && <p>Reconcile cancelled.</p>}
      {!isRunning && !isCancelled && message && <MessageBanner message={message} />}
      {!isRunning && !isCancelled && !result && !message && <p>Checking for differences...</p>}
      {!isRunning && !isCancelled && hasNoDifferences && (
        <p>{`${result.matchCount} file(s) match. No differences found.`}</p>
      )}
      {!isRunning && !isCancelled && result && !hasNoDifferences && (
        <div className={styles.section}>
          <p className={styles.summary}>{`${result.matchCount} file(s) match.`}</p>
          <p className={styles.summary}>
            <span className={styles.missingDestination}>
              {`${result.missingOnDestination.length} missing on destination`}
            </span>
            {", "}
            <span className={styles.missingSource}>
              {`${result.missingOnSource.length} missing on source`}
            </span>
            {", "}
            <span className={styles.differs}>{`${result.differs.length} differ`}</span>
            {", "}
            <span className={styles.erroredPath}>{`${result.errors.length} errored`}</span>
          </p>
          <ScrollList rows={resultRows} />
        </div>
      )}
    </Modal>
  );
};
