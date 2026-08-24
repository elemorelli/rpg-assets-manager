import {
  faCheck,
  faCheckDouble,
  faClipboardCheck,
  faCopy,
  faGlobe,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type JSX, useEffect, useRef, useState } from "react";

import { Button } from "#components/button/button.tsx";
import { ConfirmDialog } from "#components/confirm-dialog/confirm-dialog.tsx";
import { IconButton } from "#components/icon-button/icon-button.tsx";
import { MessageBanner } from "#components/message-banner/message-banner.tsx";
import { Modal } from "#components/modal/modal.tsx";
import type { FoundryWorld } from "#web/requests/foundry-worlds/list.ts";
import * as api from "#web/requests/index.ts";
import { describeErrorAsMessage } from "#web/utils/message.ts";
import { useFetchOnMount } from "#web/utils/use-fetch-on-mount.ts";

import styles from "./foundry-modal.module.css";
import { FoundryPlaylistList } from "./foundry-playlist-list.tsx";

export interface FoundryModalProps {
  onClose: () => void;
  onMarkedApplied?: () => void;
}

const COPY_FEEDBACK_DURATION_MS = 1500;

export const FoundryModal = ({ onClose, onMarkedApplied }: FoundryModalProps): JSX.Element => {
  const {
    data: worlds,
    setData: setWorlds,
    message,
    setMessage,
  } = useFetchOnMount<FoundryWorld[]>(() => api.fetchFoundryWorlds(), []);

  const [copiedWorldId, setCopiedWorldId] = useState<number | null>(null);
  const [confirmingApplyWorldId, setConfirmingApplyWorldId] = useState<number | null>(null);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  const handleMarkApplied = (worldId: number): void => {
    setConfirmingApplyWorldId(null);

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
      .catch((caught: unknown) => setMessage(describeErrorAsMessage(caught)));
  };

  const handleCopyMacro = (worldId: number, macro: string): void => {
    void navigator.clipboard.writeText(macro).then(() => {
      setCopiedWorldId(worldId);

      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }

      copyResetTimeoutRef.current = setTimeout(() => {
        setCopiedWorldId(null);
      }, COPY_FEEDBACK_DURATION_MS);
    });
  };

  const confirmingApplyWorld = worlds?.find((world) => world.id === confirmingApplyWorldId);

  const footer = (
    <Button variant="secondary" onClick={onClose}>
      Close
    </Button>
  );

  return (
    <Modal title="Foundry migration status" onClose={onClose} footer={footer}>
      <h3 className={styles.heading}>
        <FontAwesomeIcon className={styles.headingIcon} icon={faGlobe} aria-hidden="true" />
        Foundry worlds
      </h3>
      {message && <MessageBanner message={message} />}
      {!worlds && !message && <p>Checking Foundry worlds...</p>}
      {worlds && worlds.length === 0 && <p>No Foundry worlds configured.</p>}
      {worlds && worlds.length > 0 && (
        <ul className={styles.worldList}>
          {worlds.map((world) => (
            <li key={world.id} className={styles.world}>
              <div className={styles.worldHeader}>
                <p className={styles.worldName}>{world.name}</p>
                {world.pendingMacro ? (
                  <span className={styles.pendingBadge}>
                    {`${world.pendingRenameCount} rename(s) pending.`}
                  </span>
                ) : (
                  <span className={styles.upToDate}>Up to date.</span>
                )}
              </div>
              {world.pendingMacro && (
                <div className={styles.macroBlock}>
                  <div className={styles.macroToolbar}>
                    <span className={styles.macroLabel}>Migration macro</span>
                    <div className={styles.macroActions}>
                      <IconButton
                        icon={copiedWorldId === world.id ? faClipboardCheck : faCopy}
                        label={copiedWorldId === world.id ? "Copied" : "Copy macro"}
                        onClick={() => handleCopyMacro(world.id, world.pendingMacro ?? "")}
                      />
                      <IconButton
                        icon={faCheckDouble}
                        label="Mark as applied"
                        onClick={() => setConfirmingApplyWorldId(world.id)}
                      />
                    </div>
                  </div>
                  <textarea
                    className={styles.macroText}
                    readOnly
                    value={world.pendingMacro}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <FoundryPlaylistList />
      {confirmingApplyWorld && (
        <ConfirmDialog
          title="Mark as applied"
          icon={faCheck}
          message={`This clears the ${confirmingApplyWorld.pendingRenameCount} pending rename(s) tracked for "${confirmingApplyWorld.name}". Only confirm after you've actually run the macro inside Foundry.`}
          confirmLabel="Mark as applied"
          onConfirm={() => handleMarkApplied(confirmingApplyWorld.id)}
          onCancel={() => setConfirmingApplyWorldId(null)}
        />
      )}
    </Modal>
  );
};
