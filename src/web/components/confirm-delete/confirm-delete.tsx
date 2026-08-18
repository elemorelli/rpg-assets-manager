import type { JSX } from "react";

export interface ConfirmDeleteProps {
  entryName: string;
  containerClassName: string;
  messageClassName: string;
  buttonClassName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDelete = ({
  entryName,
  containerClassName,
  messageClassName,
  buttonClassName,
  onConfirm,
  onCancel,
}: ConfirmDeleteProps): JSX.Element => (
  <div className={containerClassName}>
    <p className={messageClassName}>Delete "{entryName}"?</p>
    <button type="button" className={buttonClassName} onClick={onConfirm}>
      Confirm
    </button>
    <button type="button" className={buttonClassName} onClick={onCancel}>
      Cancel
    </button>
  </div>
);
