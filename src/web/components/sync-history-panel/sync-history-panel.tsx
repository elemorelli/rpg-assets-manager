import { type JSX, useEffect, useState } from "react";

import * as api from "#web/requests/index.ts";
import type { SyncRun } from "#web/requests/sync-runs/list.ts";
import { describeError } from "#web/utils/describe-error.ts";

import styles from "./sync-history-panel.module.css";

export interface SyncHistoryPanelProps {
  refreshToken: number;
}

const describeRun = (run: SyncRun): string =>
  `${new Date(run.startedAt).toLocaleString()} — ${run.outcome}: ${run.addedCount} added, ${run.modifiedCount} modified, ${run.deletedCount} deleted, ${run.renamedCount} renamed`;

export const SyncHistoryPanel = ({ refreshToken }: SyncHistoryPanelProps): JSX.Element => {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .fetchSyncRuns()
      .then(setRuns)
      .catch((caught: unknown) => setError(describeError(caught)));
  }, [refreshToken]);

  return (
    <div className={styles.panel}>
      {error && <p className={styles.error}>{error}</p>}
      {runs.length === 0 ? (
        <p>No sync runs yet.</p>
      ) : (
        <ul className={styles.runList}>
          {runs.map((run) => (
            <li key={run.id} className={styles.run}>
              <p className={styles.summary}>{describeRun(run)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
