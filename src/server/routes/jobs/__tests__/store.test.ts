import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelCurrentJob,
  getCurrentJob,
  setCurrentJob,
  setCurrentJobController,
  subscribeToJobChanges,
} from "../store.ts";

describe("jobStore", () => {
  beforeEach(() => {
    setCurrentJob(null);
    setCurrentJobController(null);
  });

  it("starts with no current job", () => {
    expect(getCurrentJob()).toBeNull();
  });

  it("returns the job that was set", () => {
    const job = { type: "rescan", stage: "hashing", done: 0, total: 10, startedAt: 0, error: null };

    setCurrentJob(job);

    expect(getCurrentJob()).toEqual(job);
  });

  it("notifies subscribers when the job changes", () => {
    const listener = vi.fn();
    subscribeToJobChanges(listener);
    const job = { type: "rescan", stage: "hashing", done: 0, total: 10, startedAt: 0, error: null };

    setCurrentJob(job);

    expect(listener).toHaveBeenCalledWith(job);
  });

  it("stops notifying a subscriber once unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToJobChanges(listener);

    unsubscribe();
    setCurrentJob({
      type: "rescan",
      stage: "hashing",
      done: 0,
      total: 10,
      startedAt: 0,
      error: null,
    });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("cancelCurrentJob", () => {
  beforeEach(() => {
    setCurrentJob(null);
    setCurrentJobController(null);
  });

  it("returns false when no job is registered", () => {
    expect(cancelCurrentJob()).toBe(false);
  });

  it("returns false and leaves the controller untouched when the job isn't cancellable", () => {
    const controller = new AbortController();
    setCurrentJobController({ controller, cancellable: false });

    expect(cancelCurrentJob()).toBe(false);
    expect(controller.signal.aborted).toBe(false);
  });

  it("aborts the controller and returns true when the job is cancellable", () => {
    const controller = new AbortController();
    setCurrentJobController({ controller, cancellable: true });

    expect(cancelCurrentJob()).toBe(true);
    expect(controller.signal.aborted).toBe(true);
  });
});
