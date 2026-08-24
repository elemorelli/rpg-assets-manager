import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { type JSX, type MouseEvent, type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

import { Panel } from "#components/panel/panel.tsx";

import styles from "./modal.module.css";

export interface ModalProps {
  title: string;
  icon?: IconDefinition;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
  size?: "md" | "sm";
}

const DEFAULT_SIZE: NonNullable<ModalProps["size"]> = "md";

const SIZE_CLASS_NAMES: Record<NonNullable<ModalProps["size"]>, string> = {
  md: styles.sizeMd,
  sm: styles.sizeSm,
};

export const Modal = ({
  title,
  icon,
  onClose,
  children,
  footer,
  dismissible = true,
  size = DEFAULT_SIZE,
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
      <Panel
        elevated
        className={clsx(styles.dialog, SIZE_CLASS_NAMES[size])}
        role="dialog"
        aria-modal="true"
        aria-label={title}>
        <div className={styles.header}>
          <span className={styles.titleGroup}>
            {icon && (
              <FontAwesomeIcon className={styles.titleIcon} icon={icon} aria-hidden="true" />
            )}
            <span className={styles.title} title={title}>
              {title}
            </span>
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
      </Panel>
    </div>,
    document.body,
  );
};
