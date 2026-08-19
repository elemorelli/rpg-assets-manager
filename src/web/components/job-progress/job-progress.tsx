import { type JSX, useEffect, useReducer, useRef, useState } from "react";

import { parseJobEvent } from "#utils/job.ts";
import { Modal } from "#web/components/modal/modal.tsx";
import { ProgressModal } from "#web/components/progress-modal/progress-modal.tsx";
import { computeEtaSeconds } from "#web/utils/job-eta.ts";
import { type JobDisplayState, nextJobDisplayState } from "#web/utils/job-progress-state.ts";
import { iconForJobType } from "#web/utils/job-type-icon.ts";

import styles from "./job-progress.module.css";

const SUCCESS_AUTO_DISMISS_MS = 4000;
const ETA_TICK_MS = 1000;

const IDLE: JobDisplayState = { kind: "idle" };

type RunningState = Extract<JobDisplayState, { kind: "running" }>;

const runningTitle = (state: RunningState): string => `${state.type}: ${state.stage}`;

export interface JobProgressProps {
  onJobSucceeded?: (type: string) => void;
}

export const JobProgress = ({ onJobSucceeded }: JobProgressProps = {}): JSX.Element | null => {
  const [displayState, setDisplayState] = useState<JobDisplayState>(IDLE);
  const [, tick] = useReducer((count: number) => count + 1, 0);
  const onJobSucceededRef = useRef(onJobSucceeded);
  onJobSucceededRef.current = onJobSucceeded;

  useEffect(() => {
    const source = new EventSource("/api/jobs/stream");

    source.onmessage = (event) => {
      const incoming = parseJobEvent(event.data);

      setDisplayState((previous) => {
        const next = nextJobDisplayState(previous, incoming);

        if (next.kind === "succeeded" && previous.kind === "running") {
          onJobSucceededRef.current?.(previous.type);
        }

        return next;
      });
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
      <ProgressModal
        title={runningTitle(displayState)}
        icon={iconForJobType(displayState.type)}
        done={displayState.done}
        total={displayState.total}
        detail={displayState.detail}
        etaSeconds={eta}
        onClose={handleDismiss}
      />
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
