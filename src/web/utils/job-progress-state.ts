import type { CurrentJob, JobType } from "#utils/job.ts";

export type JobDisplayState =
  | { kind: "idle" }
  | {
      kind: "running";
      type: JobType;
      stage: string;
      detail?: string;
      done: number;
      total: number;
      startedAt: number;
      indeterminate: boolean;
    }
  | { kind: "succeeded"; type: JobType }
  | { kind: "cancelled"; type: JobType }
  | { kind: "failed"; type: JobType; detail?: string; error: string };

export const nextJobDisplayState = (
  previous: JobDisplayState,
  incoming: CurrentJob,
): JobDisplayState => {
  if (incoming === null) {
    if (previous.kind === "running") {
      return { kind: "succeeded", type: previous.type };
    }

    return { kind: "idle" };
  }

  if (incoming.cancelled === true) {
    return { kind: "cancelled", type: incoming.type };
  }

  if (incoming.error !== null) {
    return {
      kind: "failed",
      type: incoming.type,
      detail: incoming.detail,
      error: incoming.error,
    };
  }

  return {
    kind: "running",
    type: incoming.type,
    stage: incoming.stage,
    detail: incoming.detail,
    done: incoming.done,
    total: incoming.total,
    startedAt: incoming.startedAt,
    indeterminate: incoming.total === 0,
  };
};
