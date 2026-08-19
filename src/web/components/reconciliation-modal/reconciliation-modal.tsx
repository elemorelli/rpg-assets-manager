import { type JSX, useMemo } from "react";

import { Modal } from "#components/modal/modal.tsx";
import { ScrollList, type ScrollListRow } from "#components/scroll-list/scroll-list.tsx";
import * as api from "#web/requests/index.ts";
import type { RcloneCheckResult } from "#web/requests/reconcile/check.ts";
import { useFetchOnMount } from "#web/utils/use-fetch-on-mount.ts";

import styles from "./reconciliation-modal.module.css";

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
  const { data: result, error } = useFetchOnMount<RcloneCheckResult>(() => api.reconcile(), []);

  const resultRows = useMemo(() => (result ? buildResultRows(result) : []), [result]);

  const hasNoDifferences =
    result !== null &&
    result.missingOnDestination.length === 0 &&
    result.missingOnSource.length === 0 &&
    result.differs.length === 0 &&
    result.errors.length === 0;

  const footer = (
    <button type="button" onClick={onClose}>
      Close
    </button>
  );

  return (
    <Modal title="Reconcile with R2" onClose={onClose} footer={footer}>
      {error && <p className={styles.error}>{error}</p>}
      {!result && !error && <p>Checking for differences...</p>}
      {hasNoDifferences && <p>{`${result.matchCount} file(s) match. No differences found.`}</p>}
      {result && !hasNoDifferences && (
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
