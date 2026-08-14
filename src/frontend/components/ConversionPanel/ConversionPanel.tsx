import { type JSX, useState } from "react";
import type { ConversionPlan } from "../../requests/convert/plan/convertPlan.ts";
import * as api from "../../requests/index.ts";
import styles from "./ConversionPanel.module.css";

export interface ConversionPanelProps {
  onConverted: () => void;
}

const describeError = (caught: unknown): string =>
  caught instanceof Error ? caught.message : "Something went wrong";

export const ConversionPanel = ({ onConverted }: ConversionPanelProps): JSX.Element => {
  const [plan, setPlan] = useState<ConversionPlan | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = (): void => {
    setBusy(true);
    setError(null);

    api
      .fetchConversionPlan()
      .then(setPlan)
      .catch((caught: unknown) => setError(describeError(caught)))
      .finally(() => setBusy(false));
  };

  const handleConvert = (): void => {
    setBusy(true);
    setError(null);

    api
      .convert()
      .then(() => {
        setPlan(null);
        onConverted();
      })
      .catch((caught: unknown) => setError(describeError(caught)))
      .finally(() => setBusy(false));
  };

  const hasNothingToConvert =
    plan !== null && plan.candidates.length === 0 && plan.conflicts.length === 0;

  return (
    <div className={styles.panel}>
      <button type="button" disabled={busy} onClick={handleCheck}>
        Check for conversions
      </button>
      {error && <p className={styles.error}>{error}</p>}
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
          <button type="button" disabled={busy} onClick={handleConvert}>
            {`Convert ${plan.candidates.length} file(s)`}
          </button>
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
    </div>
  );
};
