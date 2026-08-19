import { advanceJob, failJob, startJob, toErrorMessage } from "#utils/job.ts";

import { setCurrentJob } from "./store.ts";

interface TrackedJobProgress {
  done: number;
  total: number;
  detail?: string;
}

export const runTrackedJob = async <T>(
  type: string,
  stage: string,
  failureMessage: string,
  operation: (onProgress: (progress: TrackedJobProgress) => void) => Promise<T>,
): Promise<T> => {
  let job = startJob(type, stage, 0);
  setCurrentJob(job);

  try {
    const result = await operation((progress) => {
      job = advanceJob({ ...job, total: progress.total }, progress.done, progress.detail);
      setCurrentJob(job);
    });

    setCurrentJob(null);

    return result;
  } catch (error) {
    setCurrentJob(failJob(job, toErrorMessage(error, failureMessage)));
    throw error;
  }
};
