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
  const hasNothingToConvert = plan !== null && plan.candidates.length === 0;
  const newCandidates = plan?.candidates.filter((candidate) => !candidate.willOverwrite) ?? [];
  const overwritingCandidates =
    plan?.candidates.filter((candidate) => candidate.willOverwrite) ?? [];

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
      {newCandidates.length > 0 && (
        <div className={styles.section}>
          <p>{`${newCandidates.length} file(s) will be converted:`}</p>
          <ul className={styles.list}>
            {newCandidates.map((candidate) => (
              <li key={candidate.relativePath}>
                {`${candidate.relativePath} -> ${candidate.destinationPath}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {overwritingCandidates.length > 0 && (
        <div className={styles.section}>
          <p className={styles.warning}>
            {`${overwritingCandidates.length} file(s) will overwrite an existing destination:`}
          </p>
          <ul className={styles.list}>
            {overwritingCandidates.map((candidate) => (
              <li key={candidate.relativePath}>
                {`${candidate.relativePath} -> ${candidate.destinationPath}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
};
