import { describe, expect, it } from "vitest";

import { nextWidth } from "../resizable-width.ts";

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const STARTING_WIDTH = 260;

describe("nextWidth", () => {
  it("adds the mouse delta to the starting width when within bounds", () => {
    const startClientX = 100;
    const currentClientX = 140;
    const expandedWidth = 300;

    expect(nextWidth(STARTING_WIDTH, startClientX, currentClientX, MIN_WIDTH, MAX_WIDTH)).toBe(
      expandedWidth,
    );
  });

  it("shrinks the width when the mouse moves left", () => {
    const startClientX = 140;
    const currentClientX = 100;
    const shrunkWidth = 220;

    expect(nextWidth(STARTING_WIDTH, startClientX, currentClientX, MIN_WIDTH, MAX_WIDTH)).toBe(
      shrunkWidth,
    );
  });

  it("clamps to the minimum when the drag would go below it", () => {
    const startWidth = 200;
    const startClientX = 200;
    const currentClientX = 0;

    expect(nextWidth(startWidth, startClientX, currentClientX, MIN_WIDTH, MAX_WIDTH)).toBe(
      MIN_WIDTH,
    );
  });

  it("clamps to the maximum when the drag would go above it", () => {
    const startWidth = 450;
    const startClientX = 0;
    const currentClientX = 200;

    expect(nextWidth(startWidth, startClientX, currentClientX, MIN_WIDTH, MAX_WIDTH)).toBe(
      MAX_WIDTH,
    );
  });
});
