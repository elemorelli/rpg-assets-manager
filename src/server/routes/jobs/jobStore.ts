import { EventEmitter } from "node:events";
import type { CurrentJob } from "../../../core/job.ts";

const JOB_CHANGED_EVENT = "job-changed";

const emitter = new EventEmitter();
let currentJob: CurrentJob = null;

export const getCurrentJob = (): CurrentJob => currentJob;

export const setCurrentJob = (job: CurrentJob): void => {
  currentJob = job;
  emitter.emit(JOB_CHANGED_EVENT, currentJob);
};

export const subscribeToJobChanges = (listener: (job: CurrentJob) => void): (() => void) => {
  emitter.on(JOB_CHANGED_EVENT, listener);

  return () => emitter.off(JOB_CHANGED_EVENT, listener);
};
