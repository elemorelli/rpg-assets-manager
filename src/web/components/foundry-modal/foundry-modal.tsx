import { type JSX, useEffect, useState } from "react";

import { Modal } from "#components/modal/modal.tsx";
import type { FoundryWorld } from "#web/requests/foundry-worlds/list.ts";
import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";

import styles from "./foundry-modal.module.css";

export interface FoundryModalProps {
  onClose: () => void;
  onMarkedApplied?: () => void;
}

export const FoundryModal = ({ onClose, onMarkedApplied }: FoundryModalProps): JSX.Element => {
  const [worlds, setWorlds] = useState<FoundryWorld[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .fetchFoundryWorlds()
      .then(setWorlds)
      .catch((caught: unknown) => setError(describeError(caught)));
  }, []);

  const handleMarkApplied = (worldId: number): void => {
    api
      .markFoundryWorldApplied(worldId)
      .then(() => {
        setWorlds((previousWorlds) =>
          (previousWorlds ?? []).map((world) =>
            world.id === worldId ? { ...world, pendingMacro: null, pendingRenameCount: 0 } : world,
          ),
        );
        onMarkedApplied?.();
      })
      .catch((caught: unknown) => setError(describeError(caught)));
  };

  const footer = (
    <button type="button" onClick={onClose}>
      Close
    </button>
  );

  return (
    <Modal title="Foundry migration status" onClose={onClose} footer={footer}>
      {error && <p className={styles.error}>{error}</p>}
      {!worlds && !error && <p>Checking Foundry worlds...</p>}
      {worlds && worlds.length === 0 && <p>No Foundry worlds configured.</p>}
      {worlds && worlds.length > 0 && (
        <ul className={styles.worldList}>
          {worlds.map((world) => (
            <li key={world.id} className={styles.world}>
              <p className={styles.worldName}>{world.name}</p>
              {world.pendingMacro ? (
                <>
                  <p className={styles.summary}>
                    {`${world.pendingRenameCount} rename(s) pending.`}
                  </p>
                  <textarea
                    className={styles.macroText}
                    readOnly
                    value={world.pendingMacro}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    type="button"
                    className={styles.markAppliedButton}
                    onClick={() => handleMarkApplied(world.id)}>
                    Mark as applied
                  </button>
                </>
              ) : (
                <p className={styles.upToDate}>Up to date.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};
