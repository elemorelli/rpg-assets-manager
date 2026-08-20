import { describe, expect, it } from "vitest";

import { ApiError } from "#web/requests/http-client.ts";

import { isConflictError } from "../is-conflict-error.ts";

const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;

describe("isConflictError", () => {
  it("returns true for an ApiError with a 409 status", () => {
    expect(isConflictError(new ApiError("Destination already exists", CONFLICT_STATUS))).toBe(true);
  });

  it("returns false for an ApiError with a different status", () => {
    expect(isConflictError(new ApiError("Not found", NOT_FOUND_STATUS))).toBe(false);
  });

  it("returns false for a plain error", () => {
    expect(isConflictError(new Error("boom"))).toBe(false);
  });

  it("returns false for a non-error value", () => {
    expect(isConflictError("boom")).toBe(false);
  });
});
