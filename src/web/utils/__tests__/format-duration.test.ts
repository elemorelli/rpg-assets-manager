import { describe, expect, it } from "vitest";

import { formatDuration } from "../format-duration.ts";

const TWO_MINUTES_FIVE_SECONDS = 125;
const ONE_HOUR_TWO_MINUTES_THREE_SECONDS = 3723;
const ALMOST_A_MINUTE = 59.9;

describe("formatDuration", () => {
  it("formats minutes and zero-padded seconds", () => {
    expect(formatDuration(TWO_MINUTES_FIVE_SECONDS)).toBe("2:05");
  });

  it("adds hours when needed", () => {
    expect(formatDuration(ONE_HOUR_TWO_MINUTES_THREE_SECONDS)).toBe("1:02:03");
  });

  it("rounds fractional seconds down", () => {
    expect(formatDuration(ALMOST_A_MINUTE)).toBe("0:59");
  });
});
