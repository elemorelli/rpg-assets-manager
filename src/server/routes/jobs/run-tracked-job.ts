import {
  advanceJob,
  cancelJob,
  failJob,
  type JobProgress,
  type JobType,
  startJob,
  toErrorMessage,
} from "#utils/job.ts";

import { setCurrentJob, setCurrentJobController } from "./store.ts";

interface RunTrackedJobOptions {
  // The operation must check the signal itself; see cancelCurrentJob in store.ts for why.
  cancellable?: boolean;
}

export const runTrackedJob = async <T>(
  type: JobType,
  stage: string,
  failureMessage: string,
  operation: (onProgress: (progress: JobProgress) => void, signal: AbortSignal) => Promise<T>,
  options: RunTrackedJobOptions = {},
): Promise<T> => {
  let job = startJob(type, stage, 0);
  const controller = new AbortController();

  setCurrentJob(job);
  setCurrentJobController({ controller, cancellable: options.cancellable ?? false });

  try {
    const result = await operation((progress) => {
      const stage = progress.stage ?? job.stage;

      job = advanceJob({ ...job, total: progress.total, stage }, progress.done, progress.detail);
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
