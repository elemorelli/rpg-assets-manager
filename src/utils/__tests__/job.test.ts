import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { advanceJob, cancelJob, failJob, formatJobEvent, parseJobEvent, startJob } from "../job.ts";

const TOTAL_FILES = 10;
const DONE_AFTER_ADVANCE = 4;
const DONE_BEFORE_FAILURE = 3;
const FIXED_NOW = new Date("2026-08-19T00:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("startJob", () => {
  it("starts a job at zero progress with no error, no detail, and the current timestamp", () => {
    expect(startJob("rescan", "hashing", TOTAL_FILES)).toEqual({
      type: "rescan",
      stage: "hashing",
      detail: undefined,
      done: 0,
      total: TOTAL_FILES,
      startedAt: FIXED_NOW.getTime(),
      error: null,
    });
  });
});

describe("advanceJob", () => {
  it("updates done while leaving other fields alone", () => {
    const job = startJob("rescan", "hashing", TOTAL_FILES);

    expect(advanceJob(job, DONE_AFTER_ADVANCE)).toEqual({
      type: "rescan",
      stage: "hashing",
      detail: undefined,
      done: DONE_AFTER_ADVANCE,
      total: TOTAL_FILES,
      startedAt: FIXED_NOW.getTime(),
      error: null,
    });
  });

  it("updates the detail when one is given", () => {
    const job = startJob("rescan", "hashing", TOTAL_FILES);

    expect(advanceJob(job, DONE_AFTER_ADVANCE, "assets/goblin.png")).toEqual({
      type: "rescan",
      stage: "hashing",
      detail: "assets/goblin.png",
      done: DONE_AFTER_ADVANCE,
      total: TOTAL_FILES,
      startedAt: FIXED_NOW.getTime(),
      error: null,
    });
  });
});

describe("failJob", () => {
  it("sets the error while leaving progress and detail alone", () => {
    const job = advanceJob(
      startJob("rescan", "hashing", TOTAL_FILES),
      DONE_BEFORE_FAILURE,
      "assets/goblin.png",
    );

    expect(failJob(job, "disk full")).toEqual({
      type: "rescan",
      stage: "hashing",
      detail: "assets/goblin.png",
      done: DONE_BEFORE_FAILURE,
      total: TOTAL_FILES,
      startedAt: FIXED_NOW.getTime(),
      error: "disk full",
    });
  });
});

describe("cancelJob", () => {
  it("marks the job cancelled while leaving progress and detail alone", () => {
    const job = advanceJob(
      startJob("rescan", "hashing", TOTAL_FILES),
      DONE_BEFORE_FAILURE,
      "assets/goblin.png",
    );

    expect(cancelJob(job)).toEqual({
      type: "rescan",
      stage: "hashing",
      detail: "assets/goblin.png",
      done: DONE_BEFORE_FAILURE,
      total: TOTAL_FILES,
      startedAt: FIXED_NOW.getTime(),
      error: null,
      cancelled: true,
    });
  });
});

describe("formatJobEvent", () => {
  it("encodes a job as an SSE data line", () => {
    const job = startJob("rescan", "hashing", TOTAL_FILES);

    expect(formatJobEvent(job)).toBe(
      `data: {"type":"rescan","stage":"hashing","done":0,"total":10,"startedAt":${FIXED_NOW.getTime()},"error":null}\n\n`,
    );
  });

  it("encodes null as the literal SSE null data line", () => {
    expect(formatJobEvent(null)).toBe("data: null\n\n");
  });
});

describe("parseJobEvent", () => {
  it("round-trips a formatted job event's data payload", () => {
    const job = startJob("rescan", "hashing", TOTAL_FILES);

    expect(parseJobEvent(JSON.stringify(job))).toEqual(job);
  });

  it("parses the literal null payload as null", () => {
    expect(parseJobEvent("null")).toBeNull();
  });
});
