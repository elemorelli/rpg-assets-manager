import { EventEmitter } from "node:events";

import type { CurrentJob } from "#utils/job.ts";

const JOB_CHANGED_EVENT = "job-changed";

export interface CurrentJobController {
  controller: AbortController;
  cancellable: boolean;
}

const emitter = new EventEmitter();
let currentJob: CurrentJob = null;
let currentJobController: CurrentJobController | null = null;

export const getCurrentJob = (): CurrentJob => currentJob;

export const setCurrentJob = (job: CurrentJob): void => {
  currentJob = job;
  emitter.emit(JOB_CHANGED_EVENT, currentJob);
};

export const setCurrentJobController = (value: CurrentJobController | null): void => {
  currentJobController = value;
};

// Only aborts jobs that were registered as cancellable: a job whose
// operation never checks the signal would otherwise still get labeled
// "cancelled" once aborted, even though it ran to completion unaffected.
export const cancelCurrentJob = (): boolean => {
  if (currentJobController === null || !currentJobController.cancellable) {
    return false;
  }

  currentJobController.controller.abort();

  return true;
};

export const subscribeToJobChanges = (listener: (job: CurrentJob) => void): (() => void) => {
  emitter.on(JOB_CHANGED_EVENT, listener);

  return () => emitter.off(JOB_CHANGED_EVENT, listener);
};
