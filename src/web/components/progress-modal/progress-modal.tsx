import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { JSX, ReactNode } from "react";

import { JobProgressBar } from "#components/job-progress-bar/job-progress-bar.tsx";
import { Modal } from "#components/modal/modal.tsx";

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
}: ProgressModalProps): JSX.Element => (
  <Modal
    title={title}
    icon={icon}
    onClose={onClose}
    dismissible={dismissible}
    footer={footer}
    size="sm">
    <JobProgressBar done={done} total={total} detail={detail} etaSeconds={etaSeconds} />
  </Modal>
);
