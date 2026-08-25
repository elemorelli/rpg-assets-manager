import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { JSX, ReactNode } from "react";

import { Modal } from "#components/modal/modal.tsx";
import { formatEta } from "#web/utils/job-eta.ts";

import styles from "./progress-modal.module.css";

export interface ProgressModalProps {
  title: string;
  icon?: IconDefinition;
  done: number;
  total: number;
  detail?: string;
  etaSeconds?: number | null;
  onClose: () => void;
  dismissible?: boolean;
  footer?: ReactNode;
}

export const ProgressModal = ({
  title,
  icon,
  done,
  total,
  detail,
  etaSeconds,
  onClose,
  dismissible = false,
  footer,
}: ProgressModalProps): JSX.Element => {
  const indeterminate = total === 0;

  return (
    <Modal
      title={title}
      icon={icon}
      onClose={onClose}
      dismissible={dismissible}
      footer={footer}
      size="sm">
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
    </Modal>
  );
};
