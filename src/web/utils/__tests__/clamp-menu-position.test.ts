import { describe, expect, it } from "vitest";

import { clampMenuPosition } from "../clamp-menu-position.ts";

describe("clampMenuPosition", () => {
  it("returns the requested position unchanged when the menu fits", () => {
    const result = clampMenuPosition(
      { x: 100, y: 100 },
      { width: 160, height: 120 },
      { width: 1024, height: 768 },
    );

    expect(result).toEqual({ x: 100, y: 100 });
  });

  it("flips the x position leftward when the menu would overflow the right edge", () => {
    const result = clampMenuPosition(
      { x: 900, y: 100 },
      { width: 160, height: 120 },
      { width: 1024, height: 768 },
    );

    expect(result).toEqual({ x: 740, y: 100 });
  });

  it("flips the y position upward when the menu would overflow the bottom edge", () => {
    const result = clampMenuPosition(
      { x: 100, y: 700 },
      { width: 160, height: 120 },
      { width: 1024, height: 768 },
    );

    expect(result).toEqual({ x: 100, y: 580 });
  });

  it("clamps a left flip to 0 when the menu is wider than the viewport", () => {
    const result = clampMenuPosition(
      { x: 900, y: 100 },
      { width: 1200, height: 120 },
      { width: 1024, height: 768 },
    );

    expect(result).toEqual({ x: 0, y: 100 });
  });

  it("clamps a top flip to 0 when the menu is taller than the viewport", () => {
    const result = clampMenuPosition(
      { x: 100, y: 700 },
      { width: 160, height: 900 },
      { width: 1024, height: 768 },
    );

    expect(result).toEqual({ x: 100, y: 0 });
  });
});
