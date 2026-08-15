import { type JSX, useState } from "react";

import * as api from "#web/requests/index.ts";
import type { RcloneCheckResult } from "#web/requests/reconcile/check.ts";

import styles from "./reconciliation-panel.module.css";

interface ResultSection {
  label: string;
  paths: string[];
}

const describeError = (caught: unknown): string =>
  caught instanceof Error ? caught.message : "Something went wrong";

const buildResultSections = (result: RcloneCheckResult): ResultSection[] =>
  [
    { label: "Missing on destination:", paths: result.missingOnDestination },
    { label: "Missing on source:", paths: result.missingOnSource },
    { label: "Content differs:", paths: result.differs },
    { label: "Errored while checking:", paths: result.errors },
  ].filter((section) => section.paths.length > 0);

export const ReconciliationPanel = (): JSX.Element => {
  const [result, setResult] = useState<RcloneCheckResult | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleReconcile = (): void => {
    setBusy(true);
    setError(null);

    api
      .reconcile()
      .then(setResult)
      .catch((caught: unknown) => setError(describeError(caught)))
      .finally(() => setBusy(false));
  };

  const resultSections = result ? buildResultSections(result) : [];
  const hasNoDifferences = result !== null && resultSections.length === 0;

  return (
    <div className={styles.panel}>
      <button type="button" disabled={busy} onClick={handleReconcile}>
        Reconcile with R2
      </button>
      {error && <p className={styles.error}>{error}</p>}
      {hasNoDifferences && <p>{`${result.matchCount} file(s) match. No differences found.`}</p>}
      {result && resultSections.length > 0 && (
        <div className={styles.section}>
          <p>{`${result.matchCount} file(s) match.`}</p>
          {resultSections.map((section) => (
            <div key={section.label} className={styles.section}>
              <p>{section.label}</p>
              <ul className={styles.list}>
                {section.paths.map((relativePath) => (
                  <li key={relativePath}>{relativePath}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
