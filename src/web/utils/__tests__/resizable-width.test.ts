import { describe, expect, it } from "vitest";

import { nextWidth } from "../resizable-width.ts";

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;

describe("nextWidth", () => {
  it("adds the mouse delta to the starting width when within bounds", () => {
    expect(nextWidth(260, 100, 140, MIN_WIDTH, MAX_WIDTH)).toBe(300);
  });

  it("shrinks the width when the mouse moves left", () => {
    expect(nextWidth(260, 140, 100, MIN_WIDTH, MAX_WIDTH)).toBe(220);
  });

  it("clamps to the minimum when the drag would go below it", () => {
    expect(nextWidth(200, 200, 0, MIN_WIDTH, MAX_WIDTH)).toBe(MIN_WIDTH);
  });

  it("clamps to the maximum when the drag would go above it", () => {
    expect(nextWidth(450, 0, 200, MIN_WIDTH, MAX_WIDTH)).toBe(MAX_WIDTH);
  });
});
