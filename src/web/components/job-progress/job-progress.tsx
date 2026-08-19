import { type JSX, useEffect, useReducer, useState } from "react";

import { parseJobEvent } from "#utils/job.ts";
import { Modal } from "#web/components/modal/modal.tsx";
import { computeEtaSeconds, formatEta } from "#web/utils/job-eta.ts";
import { type JobDisplayState, nextJobDisplayState } from "#web/utils/job-progress-state.ts";
import { iconForJobType } from "#web/utils/job-type-icon.ts";

import styles from "./job-progress.module.css";

const SUCCESS_AUTO_DISMISS_MS = 4000;
const ETA_TICK_MS = 1000;

const IDLE: JobDisplayState = { kind: "idle" };

type RunningState = Extract<JobDisplayState, { kind: "running" }>;

const runningTitle = (state: RunningState): string => `${state.type}: ${state.stage}`;

export const JobProgress = (): JSX.Element | null => {
  const [displayState, setDisplayState] = useState<JobDisplayState>(IDLE);
  const [, tick] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const source = new EventSource("/api/jobs/stream");

    source.onmessage = (event) => {
      const incoming = parseJobEvent(event.data);
      setDisplayState((previous) => nextJobDisplayState(previous, incoming));
    };

    return () => {
      source.close();
    };
  }, []);

  useEffect(() => {
    if (displayState.kind !== "succeeded") {
      return;
    }

    const timer = setTimeout(() => setDisplayState(IDLE), SUCCESS_AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [displayState]);

  useEffect(() => {
    if (displayState.kind !== "running" || displayState.indeterminate) {
      return;
    }

    const interval = setInterval(tick, ETA_TICK_MS);

    return () => clearInterval(interval);
  }, [displayState]);

  const handleDismiss = (): void => {
    setDisplayState(IDLE);
  };

  if (displayState.kind === "idle") {
    return null;
  }

  if (displayState.kind === "running") {
    const eta = displayState.indeterminate
      ? null
      : computeEtaSeconds(
          displayState.done,
          displayState.total,
          displayState.startedAt,
          Date.now(),
        );

    return (
      <Modal
        title={runningTitle(displayState)}
        icon={iconForJobType(displayState.type)}
        onClose={handleDismiss}
        dismissible={false}>
        <div className={styles.progress}>
          {displayState.indeterminate ? (
            <span className={styles.spinner} data-testid="job-progress-spinner" />
          ) : (
            <>
              <progress
                className={styles.progressBar}
                value={displayState.done}
                max={displayState.total}
              />
              <div className={styles.meta}>
                <span>{`${displayState.done} / ${displayState.total}`}</span>
                {eta !== null && <span>{`ETA: ${formatEta(eta)}`}</span>}
              </div>
            </>
          )}

          {displayState.detail !== undefined && (
            <span className={styles.detail}>{displayState.detail}</span>
          )}
        </div>
      </Modal>
    );
  }

  const dismissButton = (
    <button type="button" onClick={handleDismiss}>
      Dismiss
    </button>
  );

  if (displayState.kind === "succeeded") {
    return (
      <Modal
        title={`${displayState.type}: completed`}
        icon={iconForJobType(displayState.type)}
        onClose={handleDismiss}
        footer={dismissButton}>
        <span>Operation completed successfully.</span>
      </Modal>
    );
  }

  return (
    <Modal
      title={`${displayState.type}: failed`}
      icon={iconForJobType(displayState.type)}
      onClose={handleDismiss}
      footer={dismissButton}>
      <div className={styles.error}>
        <span>{displayState.error}</span>
        {displayState.detail !== undefined && <span>{`File: ${displayState.detail}`}</span>}
      </div>
    </Modal>
  );
};
