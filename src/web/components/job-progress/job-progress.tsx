import { type JSX, useEffect, useState } from "react";

import { parseJobEvent } from "#utils/job.ts";
import { type JobDisplayState, nextJobDisplayState } from "#web/utils/job-progress-state.ts";

import styles from "./job-progress.module.css";

const SUCCESS_AUTO_DISMISS_MS = 4000;

const IDLE: JobDisplayState = { kind: "idle" };

export const JobProgress = (): JSX.Element | null => {
  const [displayState, setDisplayState] = useState<JobDisplayState>(IDLE);

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

  const handleDismiss = (): void => {
    setDisplayState(IDLE);
  };

  if (displayState.kind === "idle") {
    return null;
  }

  if (displayState.kind === "running") {
    return (
      <div className={styles.progress}>
        <span>{`${displayState.type}: ${displayState.stage}`}</span>
        <progress value={displayState.done} max={displayState.total} />
        <span>{`${displayState.done} / ${displayState.total}`}</span>
      </div>
    );
  }

  if (displayState.kind === "succeeded") {
    return (
      <div className={styles.succeeded}>
        <span>{`${displayState.type}: completed`}</span>
        <button type="button" className={styles.dismissButton} onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className={styles.error}>
      <span>{`${displayState.type} failed: ${displayState.error}`}</span>
      <button type="button" className={styles.dismissButton} onClick={handleDismiss}>
        Dismiss
      </button>
    </div>
  );
};
