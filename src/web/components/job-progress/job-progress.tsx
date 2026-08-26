import { type JSX, useEffect, useState } from "react";

import { Button } from "#web/components/button/button.tsx";
import { Modal } from "#web/components/modal/modal.tsx";
import { ProgressModal } from "#web/components/progress-modal/progress-modal.tsx";
import { cancelJob } from "#web/requests/index.ts";
import { computeEtaSeconds } from "#web/utils/job-eta.ts";
import { type JobDisplayState } from "#web/utils/job-progress-state.ts";
import { iconForJobType } from "#web/utils/job-type-icon.ts";
import { useJobStream } from "#web/utils/use-job-stream.ts";

import styles from "./job-progress.module.css";

const SUCCESS_AUTO_DISMISS_MS = 4000;

const IDLE: JobDisplayState = { kind: "idle" };

// Only job types whose own operation actually checks the abort signal it's
// given may offer cancellation; see runTrackedJob's cancellable option.
// Note: "reconcile" is also cancellable, but it never reaches this component
// at all (see JOB_TYPES_WITH_DEDICATED_MODAL below) since its own dedicated
// modal, ReconciliationModal, offers the cancel button instead.
const CANCELLABLE_JOB_TYPES = new Set(["rescan", "convert"]);

// These job types render their own dedicated modal (e.g. ReconciliationModal)
// that already shows live progress and the final result, so this global
// overlay must stay out of the way rather than stacking a second modal on
// top of it.
const JOB_TYPES_WITH_DEDICATED_MODAL = new Set(["reconcile"]);

type RunningState = Extract<JobDisplayState, { kind: "running" }>;

const runningTitle = (state: RunningState): string => `${state.type}: ${state.stage}`;

export interface JobProgressProps {
  onJobSucceeded?: (type: string) => void;
}

export const JobProgress = ({ onJobSucceeded }: JobProgressProps = {}): JSX.Element | null => {
  const [displayState, setDisplayState] = useJobStream(onJobSucceeded);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

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

  const handleCancel = (): void => {
    setIsCancelling(true);
    cancelJob()
      .catch(() => {})
      .finally(() => setIsCancelling(false));
  };

  if (displayState.kind === "idle") {
    return null;
  }

  if (JOB_TYPES_WITH_DEDICATED_MODAL.has(displayState.type)) {
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
