import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type JSX, type MouseEvent, type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

import styles from "./modal.module.css";

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
}

export const Modal = ({
  title,
  onClose,
  children,
  footer,
  dismissible = true,
}: ModalProps): JSX.Element => {
  useEffect(() => {
    if (!dismissible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dismissible, onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (dismissible && event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className={styles.backdrop} data-testid="modal-backdrop" onClick={handleBackdropClick}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.header}>
          <span className={styles.title} title={title}>
            {title}
          </span>
          {dismissible && (
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Close"
              onClick={onClose}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};
