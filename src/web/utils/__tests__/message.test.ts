import { describe, expect, it } from "vitest";

import { describeErrorAsMessage } from "../message.ts";

describe("describeErrorAsMessage", () => {
  it("wraps an Error's message as an error-severity message", () => {
    expect(describeErrorAsMessage(new Error("disk full"))).toEqual({
      severity: "error",
      summary: "disk full",
    });
  });

  it("falls back to a generic summary for a non-Error value", () => {
    expect(describeErrorAsMessage("boom")).toEqual({
      severity: "error",
      summary: "Something went wrong",
    });
  });
});
