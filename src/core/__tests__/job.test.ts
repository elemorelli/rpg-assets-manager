import { describe, expect, it } from "vitest";
import { advanceJob, failJob, formatJobEvent, parseJobEvent, startJob } from "../job.ts";

const TOTAL_FILES = 10;
const DONE_AFTER_ADVANCE = 4;
const DONE_BEFORE_FAILURE = 3;

describe("startJob", () => {
  it("starts a job at zero progress with no error", () => {
    expect(startJob("rescan", "hashing", TOTAL_FILES)).toEqual({
      type: "rescan",
      stage: "hashing",
      done: 0,
      total: TOTAL_FILES,
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
      done: DONE_AFTER_ADVANCE,
      total: TOTAL_FILES,
      error: null,
    });
  });
});

describe("failJob", () => {
  it("sets the error while leaving progress alone", () => {
    const job = advanceJob(startJob("rescan", "hashing", TOTAL_FILES), DONE_BEFORE_FAILURE);

    expect(failJob(job, "disk full")).toEqual({
      type: "rescan",
      stage: "hashing",
      done: DONE_BEFORE_FAILURE,
      total: TOTAL_FILES,
      error: "disk full",
    });
  });
});

describe("formatJobEvent", () => {
  it("encodes a job as an SSE data line", () => {
    const job = startJob("rescan", "hashing", TOTAL_FILES);

    expect(formatJobEvent(job)).toBe(
      'data: {"type":"rescan","stage":"hashing","done":0,"total":10,"error":null}\n\n',
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
