import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { JSX, ReactNode } from "react";

import { Button } from "#components/button/button.tsx";
import { Modal } from "#components/modal/modal.tsx";

import styles from "./confirm-dialog.module.css";

export interface ConfirmDialogProps {
  title: string;
  icon?: IconDefinition;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DEFAULT_CONFIRM_LABEL = "Confirm";
const DEFAULT_CANCEL_LABEL = "Cancel";

export const ConfirmDialog = ({
  title,
  icon,
  message,
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  cancelLabel = DEFAULT_CANCEL_LABEL,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element => {
  const footer = (
    <>
      <Button variant="secondary" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <Modal title={title} icon={icon} onClose={onCancel} footer={footer}>
      <div className={styles.message}>{message}</div>
    </Modal>
  );
};
