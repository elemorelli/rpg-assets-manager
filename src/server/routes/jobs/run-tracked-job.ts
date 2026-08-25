import { advanceJob, cancelJob, failJob, startJob, toErrorMessage } from "#utils/job.ts";

import { setCurrentJob, setCurrentJobController } from "./store.ts";

interface TrackedJobProgress {
  done: number;
  total: number;
  detail?: string;
}

interface RunTrackedJobOptions {
  // The operation must itself check the signal and stop promptly; a job
  // that ignores it would still get labeled "cancelled" here once aborted,
  // even though it ran to completion unaffected. See store.ts.
  cancellable?: boolean;
}

export const runTrackedJob = async <T>(
  type: string,
  stage: string,
  failureMessage: string,
  operation: (
    onProgress: (progress: TrackedJobProgress) => void,
    signal: AbortSignal,
  ) => Promise<T>,
  options: RunTrackedJobOptions = {},
): Promise<T> => {
  let job = startJob(type, stage, 0);
  const controller = new AbortController();

  setCurrentJob(job);
  setCurrentJobController({ controller, cancellable: options.cancellable ?? false });

  try {
    const result = await operation((progress) => {
      job = advanceJob({ ...job, total: progress.total }, progress.done, progress.detail);
      setCurrentJob(job);
    }, controller.signal);

    setCurrentJob(controller.signal.aborted ? cancelJob(job) : null);

    return result;
  } catch (error) {
    setCurrentJob(failJob(job, toErrorMessage(error, failureMessage)));
    throw error;
  } finally {
    setCurrentJobController(null);
  }
};
