import { type JSX, useEffect, useReducer, useRef, useState } from "react";

import { parseJobEvent } from "#utils/job.ts";
import { Button } from "#web/components/button/button.tsx";
import { Modal } from "#web/components/modal/modal.tsx";
import { ProgressModal } from "#web/components/progress-modal/progress-modal.tsx";
import { cancelJob } from "#web/requests/index.ts";
import { computeEtaSeconds } from "#web/utils/job-eta.ts";
import { type JobDisplayState, nextJobDisplayState } from "#web/utils/job-progress-state.ts";
import { iconForJobType } from "#web/utils/job-type-icon.ts";

import styles from "./job-progress.module.css";

const SUCCESS_AUTO_DISMISS_MS = 4000;
const ETA_TICK_MS = 1000;

const IDLE: JobDisplayState = { kind: "idle" };

// Only job types whose own operation actually checks the abort signal it's
// given may offer cancellation; see runTrackedJob's cancellable option.
const CANCELLABLE_JOB_TYPES = new Set(["rescan"]);

type RunningState = Extract<JobDisplayState, { kind: "running" }>;

const runningTitle = (state: RunningState): string => `${state.type}: ${state.stage}`;

export interface JobProgressProps {
  onJobSucceeded?: (type: string) => void;
}

export const JobProgress = ({ onJobSucceeded }: JobProgressProps = {}): JSX.Element | null => {
  const [displayState, setDisplayState] = useState<JobDisplayState>(IDLE);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
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

  const handleCancel = (): void => {
    setIsCancelling(true);
    cancelJob()
      .catch(() => {})
      .finally(() => setIsCancelling(false));
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
    const cancelButton = CANCELLABLE_JOB_TYPES.has(displayState.type) && (
      <Button variant="secondary" onClick={handleCancel} disabled={isCancelling}>
        {isCancelling ? "Cancelling…" : "Cancel"}
      </Button>
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
        footer={cancelButton}
      />
    );
  }

  const dismissButton = (
    <Button variant="secondary" onClick={handleDismiss}>
      Dismiss
    </Button>
  );

  if (displayState.kind === "succeeded") {
    return (
      <Modal
        title={`${displayState.type}: completed`}
        icon={iconForJobType(displayState.type)}
        onClose={handleDismiss}
        footer={dismissButton}
        size="sm">
        <span>Operation completed successfully.</span>
      </Modal>
    );
  }

  if (displayState.kind === "cancelled") {
    return (
      <Modal
        title={`${displayState.type}: cancelled`}
        icon={iconForJobType(displayState.type)}
        onClose={handleDismiss}
        footer={dismissButton}
        size="sm">
        <span>Operation cancelled.</span>
      </Modal>
    );
  }

  return (
    <Modal
      title={`${displayState.type}: failed`}
      icon={iconForJobType(displayState.type)}
      onClose={handleDismiss}
      footer={dismissButton}
      size="sm">
      <div className={styles.error}>
        <span>{displayState.error}</span>
        {displayState.detail !== undefined && <span>{`File: ${displayState.detail}`}</span>}
      </div>
    </Modal>
  );
};
