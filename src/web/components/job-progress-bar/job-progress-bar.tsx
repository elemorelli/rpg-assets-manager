import type { JSX } from "react";

import { formatEta } from "#web/utils/job-eta.ts";

import styles from "./job-progress-bar.module.css";

export interface JobProgressBarProps {
  done: number;
  total: number;
  detail?: string;
  etaSeconds?: number | null;
}

export const JobProgressBar = ({
  done,
  total,
  detail,
  etaSeconds,
}: JobProgressBarProps): JSX.Element => {
  const indeterminate = total === 0;

  return (
    <div className={styles.progress}>
      {indeterminate ? (
        <span className={styles.spinner} data-testid="progress-modal-spinner" />
      ) : (
        <>
          <progress className={styles.progressBar} value={done} max={total} />
          <div className={styles.meta}>
            <span>{`${done} / ${total}`}</span>
            {etaSeconds !== null && etaSeconds !== undefined && (
              <span>{`ETA: ${formatEta(etaSeconds)}`}</span>
            )}
          </div>
        </>
      )}

      {detail !== undefined && <span className={styles.detail}>{detail}</span>}
    </div>
  );
};
