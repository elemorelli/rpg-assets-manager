import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentJob, setCurrentJob, subscribeToJobChanges } from "../store.ts";

describe("jobStore", () => {
  beforeEach(() => {
    setCurrentJob(null);
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
