import { describe, expect, it } from "vitest";

import { nextWidth } from "../resizable-width.ts";

describe("nextWidth", () => {
  it("adds the mouse delta to the starting width when within bounds", () => {
    expect(nextWidth(260, 100, 140, 180, 480)).toBe(300);
  });

  it("shrinks the width when the mouse moves left", () => {
    expect(nextWidth(260, 140, 100, 180, 480)).toBe(220);
  });

  it("clamps to the minimum when the drag would go below it", () => {
    expect(nextWidth(200, 200, 0, 180, 480)).toBe(180);
  });

  it("clamps to the maximum when the drag would go above it", () => {
    expect(nextWidth(450, 0, 200, 180, 480)).toBe(480);
  });
});
