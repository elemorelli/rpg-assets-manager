import { describe, expect, it } from "vitest";

import { type JobDisplayState, nextJobDisplayState } from "../job-progress-state.ts";

const IDLE: JobDisplayState = { kind: "idle" };

describe("nextJobDisplayState", () => {
  it("stays idle when there is no job and none was running before", () => {
    const next = nextJobDisplayState(IDLE, null);

    expect(next).toEqual(IDLE);
  });

  it("moves to running when a job without an error arrives", () => {
    const next = nextJobDisplayState(IDLE, {
      type: "rescan",
      stage: "hashing",
      done: 3,
      total: 10,
      startedAt: 1000,
      error: null,
    });

    expect(next).toEqual({
      kind: "running",
      type: "rescan",
      stage: "hashing",
      detail: undefined,
      done: 3,
      total: 10,
      startedAt: 1000,
      indeterminate: false,
    });
  });

  it("carries the current file/step detail when one is given", () => {
    const next = nextJobDisplayState(IDLE, {
      type: "rescan",
      stage: "hashing",
      detail: "assets/goblin.png",
      done: 3,
      total: 10,
      startedAt: 1000,
      error: null,
    });

    expect(next).toMatchObject({ detail: "assets/goblin.png" });
  });

  it("marks progress indeterminate when the total is unknown", () => {
    const next = nextJobDisplayState(IDLE, {
      type: "reconcile",
      stage: "checking",
      done: 0,
      total: 0,
      startedAt: 1000,
      error: null,
    });

    expect(next).toMatchObject({ indeterminate: true });
  });

  it("stays running with updated progress on a later job update", () => {
    const running: JobDisplayState = {
      kind: "running",
      type: "rescan",
      stage: "hashing",
      detail: undefined,
      done: 3,
      total: 10,
      startedAt: 1000,
      indeterminate: false,
    };
    const next = nextJobDisplayState(running, {
      type: "rescan",
      stage: "hashing",
      done: 7,
      total: 10,
      startedAt: 1000,
      error: null,
    });

    expect(next).toEqual({
      kind: "running",
      type: "rescan",
      stage: "hashing",
      detail: undefined,
      done: 7,
      total: 10,
      startedAt: 1000,
      indeterminate: false,
    });
  });

  it("moves to succeeded when a running job is cleared to null", () => {
    const running: JobDisplayState = {
      kind: "running",
      type: "rescan",
      stage: "hashing",
      detail: undefined,
      done: 10,
      total: 10,
      startedAt: 1000,
      indeterminate: false,
    };
    const next = nextJobDisplayState(running, null);

    expect(next).toEqual({ kind: "succeeded", type: "rescan" });
  });

  it("moves to failed when a job arrives with an error", () => {
    const next = nextJobDisplayState(IDLE, {
      type: "rescan",
      stage: "hashing",
      done: 3,
      total: 10,
      startedAt: 1000,
      error: "disk full",
    });

    expect(next).toEqual({ kind: "failed", type: "rescan", detail: undefined, error: "disk full" });
  });

  it("carries the file/step detail that was in progress when the job failed", () => {
    const next = nextJobDisplayState(IDLE, {
      type: "rescan",
      stage: "hashing",
      detail: "assets/goblin.png",
      done: 3,
      total: 10,
      startedAt: 1000,
      error: "disk full",
    });

    expect(next).toEqual({
      kind: "failed",
      type: "rescan",
      detail: "assets/goblin.png",
      error: "disk full",
    });
  });

  it("goes back to idle when null arrives without a running job before it", () => {
    const succeeded: JobDisplayState = { kind: "succeeded", type: "rescan" };
    const next = nextJobDisplayState(succeeded, null);

    expect(next).toEqual(IDLE);
  });

  it("moves to cancelled when a running job is cancelled", () => {
    const next = nextJobDisplayState(IDLE, {
      type: "rescan",
      stage: "hashing",
      done: 3,
      total: 10,
      startedAt: 1000,
      error: null,
      cancelled: true,
    });

    expect(next).toEqual({ kind: "cancelled", type: "rescan" });
  });
});
