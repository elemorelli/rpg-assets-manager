import { describe, expect, it } from "vitest";

import { computeEtaSeconds, formatEta } from "../job-eta.ts";

const STARTED_AT = 0;
const TEN_SECONDS_MS = 10_000;
const TOTAL_FILES = 10;
const EXPECTED_ETA_SECONDS = 40;

describe("computeEtaSeconds", () => {
  it("estimates remaining seconds from elapsed time and progress so far", () => {
    const done = 2;
    const now = STARTED_AT + TEN_SECONDS_MS;

    expect(computeEtaSeconds(done, TOTAL_FILES, STARTED_AT, now)).toBe(EXPECTED_ETA_SECONDS);
  });

  it("returns null when nothing has completed yet", () => {
    const done = 0;
    const now = STARTED_AT + TEN_SECONDS_MS;

    expect(computeEtaSeconds(done, TOTAL_FILES, STARTED_AT, now)).toBeNull();
  });

  it("returns null when the total is unknown (indeterminate progress)", () => {
    const done = 0;
    const total = 0;
    const now = STARTED_AT + TEN_SECONDS_MS;

    expect(computeEtaSeconds(done, total, STARTED_AT, now)).toBeNull();
  });

  it("returns null once everything has completed", () => {
    const done = TOTAL_FILES;
    const now = STARTED_AT + TEN_SECONDS_MS;

    expect(computeEtaSeconds(done, TOTAL_FILES, STARTED_AT, now)).toBeNull();
  });

  it("returns null when no time has elapsed yet", () => {
    const done = 2;

    expect(computeEtaSeconds(done, TOTAL_FILES, STARTED_AT, STARTED_AT)).toBeNull();
  });
});

describe("formatEta", () => {
  const ZERO_SECONDS = 0;
  const FORTY_FIVE_SECONDS = 45;
  const ONE_MINUTE_FIVE_SECONDS = 65;
  const TWO_MINUTES_FIVE_SECONDS = 125;

  it("formats sub-minute durations as seconds", () => {
    expect(formatEta(ZERO_SECONDS)).toBe("0s");
    expect(formatEta(FORTY_FIVE_SECONDS)).toBe("45s");
  });

  it("formats minute-scale durations as minutes and seconds", () => {
    expect(formatEta(ONE_MINUTE_FIVE_SECONDS)).toBe("1m 5s");
    expect(formatEta(TWO_MINUTES_FIVE_SECONDS)).toBe("2m 5s");
  });
});
