import { type JSX, useEffect, useState } from "react";

import * as api from "#web/requests/index.ts";
import type { SyncRun } from "#web/requests/sync-runs/list.ts";

import styles from "./sync-history-panel.module.css";

export interface SyncHistoryPanelProps {
  refreshToken: number;
}

const describeError = (caught: unknown): string =>
  caught instanceof Error ? caught.message : "Something went wrong";

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

  const handleAcknowledge = (syncRunId: number, world: string, acknowledged: boolean): void => {
    api
      .acknowledgeWorld(syncRunId, world, acknowledged)
      .then(() => {
        setRuns((previousRuns) =>
          previousRuns.map((run) =>
            run.id === syncRunId
              ? {
                  ...run,
                  worldAcknowledgements: { ...run.worldAcknowledgements, [world]: acknowledged },
                }
              : run,
          ),
        );
      })
      .catch((caught: unknown) => setError(describeError(caught)));
  };

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
              {run.generatedMacro && (
                <div className={styles.macroSection}>
                  <p>Foundry migration macro:</p>
                  <textarea
                    className={styles.macroText}
                    readOnly
                    value={run.generatedMacro}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <div className={styles.worldChecks}>
                    {Object.entries(run.worldAcknowledgements).map(([world, acknowledged]) => (
                      <label key={world} className={styles.worldCheck}>
                        <input
                          type="checkbox"
                          checked={acknowledged}
                          onChange={(event) =>
                            handleAcknowledge(run.id, world, event.target.checked)
                          }
                        />
                        {world}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
