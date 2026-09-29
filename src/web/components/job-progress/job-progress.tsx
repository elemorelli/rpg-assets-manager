import { type JSX, type ReactNode, useEffect } from "react";

import type { JobType } from "#utils/job.ts";
import { Button } from "#web/components/button/button.tsx";
import { CancelJobButton } from "#web/components/cancel-job-button/cancel-job-button.tsx";
import { Modal } from "#web/components/modal/modal.tsx";
import { ProgressModal } from "#web/components/progress-modal/progress-modal.tsx";
import { computeEtaSeconds } from "#web/utils/job-eta.ts";
import { type JobDisplayState } from "#web/utils/job-progress-state.ts";
import { iconForJobType } from "#web/utils/job-type-icon.ts";
import { useJobStream } from "#web/utils/use-job-stream.ts";

import styles from "./job-progress.module.css";

const SUCCESS_AUTO_DISMISS_MS = 4000;

const IDLE: JobDisplayState = { kind: "idle" };

// Only types whose operation checks the abort signal; reconcile is cancellable but has its own modal.
const CANCELLABLE_JOB_TYPES: ReadonlySet<JobType> = new Set(["rescan", "convert"]);

// These types show progress and results in their own modal, so this overlay must not stack on top.
const JOB_TYPES_WITH_DEDICATED_MODAL: ReadonlySet<JobType> = new Set(["reconcile"]);

type RunningState = Extract<JobDisplayState, { kind: "running" }>;

const runningTitle = (state: RunningState): string => `${state.type}: ${state.stage}`;

interface JobOutcomeModalProps {
  type: JobType;
  outcome: string;
  onDismiss: () => void;
  children: ReactNode;
}

const JobOutcomeModal = ({
  type,
  outcome,
  onDismiss,
  children,
}: JobOutcomeModalProps): JSX.Element => (
  <Modal
    title={`${type}: ${outcome}`}
    icon={iconForJobType(type)}
    onClose={onDismiss}
    footer={
      <Button variant="secondary" onClick={onDismiss}>
        Dismiss
      </Button>
    }
    size="sm">
    {children}
  </Modal>
);

export interface JobProgressProps {
  onJobSucceeded?: (type: JobType) => void;
}

export const JobProgress = ({ onJobSucceeded }: JobProgressProps = {}): JSX.Element | null => {
  const [displayState, setDisplayState] = useJobStream(onJobSucceeded);

  useEffect(() => {
    if (displayState.kind !== "succeeded") {
      return;
    }

    const timer = setTimeout(() => setDisplayState(IDLE), SUCCESS_AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [displayState]);

  const handleDismiss = (): void => {
    setDisplayState(IDLE);
  };

  if (displayState.kind === "idle") {
    return null;
  }

  if (JOB_TYPES_WITH_DEDICATED_MODAL.has(displayState.type)) {
    return null;
  }

  if (displayState.kind === "running") {
    const eta = computeEtaSeconds(
      displayState.done,
      displayState.total,
      displayState.startedAt,
      Date.now(),
    );
    const cancelButton = CANCELLABLE_JOB_TYPES.has(displayState.type) && <CancelJobButton />;

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

  if (displayState.kind === "succeeded") {
    return (
      <JobOutcomeModal type={displayState.type} outcome="completed" onDismiss={handleDismiss}>
        <span>Operation completed successfully.</span>
      </JobOutcomeModal>
    );
  }

  if (displayState.kind === "cancelled") {
    return (
      <JobOutcomeModal type={displayState.type} outcome="cancelled" onDismiss={handleDismiss}>
        <span>Operation cancelled.</span>
      </JobOutcomeModal>
    );
  }

  return (
    <JobOutcomeModal type={displayState.type} outcome="failed" onDismiss={handleDismiss}>
      <div className={styles.error}>
        <span>{displayState.error}</span>
        {displayState.detail !== undefined && <span>{`File: ${displayState.detail}`}</span>}
      </div>
    </JobOutcomeModal>
  );
};
