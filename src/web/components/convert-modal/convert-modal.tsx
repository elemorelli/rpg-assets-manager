import { type JSX, useEffect, useState } from "react";

import { Modal } from "#components/modal/modal.tsx";
import type { ConversionPlan } from "#web/requests/convert/plan/conversion.ts";
import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";

import styles from "./convert-modal.module.css";

export interface ConvertModalProps {
  currentPath: string;
  onClose: () => void;
  onConverted: () => void;
}

export const ConvertModal = ({
  currentPath,
  onClose,
  onConverted,
}: ConvertModalProps): JSX.Element => {
  const [plan, setPlan] = useState<ConversionPlan | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .fetchConversionPlan(currentPath)
      .then(setPlan)
      .catch((caught: unknown) => setError(describeError(caught)));
  }, [currentPath]);

  const handleConvert = (): void => {
    setBusy(true);
    setError(null);

    api
      .convert(currentPath)
      .then(() => {
        onConverted();
        onClose();
      })
      .catch((caught: unknown) => setError(describeError(caught)))
      .finally(() => setBusy(false));
  };

  const folderLabel = currentPath === "" ? "root" : currentPath;
  const hasNothingToConvert =
    plan !== null && plan.candidates.length === 0 && plan.conflicts.length === 0;

  const footer =
    plan && plan.candidates.length > 0 ? (
      <>
        <button type="button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button type="button" disabled={busy} onClick={handleConvert}>
          {`Convert ${plan.candidates.length} file(s)`}
        </button>
      </>
    ) : (
      <button type="button" disabled={busy} onClick={onClose}>
        Close
      </button>
    );

  return (
    <Modal title={`Convert assets in ${folderLabel}`} onClose={onClose} footer={footer}>
      {error && <p className={styles.error}>{error}</p>}
      {!plan && !error && <p>Checking for conversions...</p>}
      {hasNothingToConvert && <p>Nothing to convert.</p>}
      {plan && plan.candidates.length > 0 && (
        <div className={styles.section}>
          <p>{`${plan.candidates.length} file(s) will be converted:`}</p>
          <ul className={styles.list}>
            {plan.candidates.map((candidate) => (
              <li key={candidate.relativePath}>
                {`${candidate.relativePath} -> ${candidate.destinationPath}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {plan && plan.conflicts.length > 0 && (
        <div className={styles.section}>
          <p>{`${plan.conflicts.length} file(s) skipped: destination already exists.`}</p>
          <ul className={styles.list}>
            {plan.conflicts.map((conflict) => (
              <li key={conflict.relativePath}>
                {`${conflict.relativePath} -> ${conflict.destinationPath}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
};
