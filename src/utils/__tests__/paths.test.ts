import { describe, expect, it } from "vitest";

import { joinRelativePath, parentDirectory } from "../paths.ts";

describe("joinRelativePath", () => {
  it("returns the name alone when the base is empty", () => {
    expect(joinRelativePath("", "tiles")).toBe("tiles");
  });

  it("joins a non-empty base and name with a slash", () => {
    expect(joinRelativePath("tiles", "forest.png")).toBe("tiles/forest.png");
  });
});

describe("parentDirectory", () => {
  it("returns an empty string for a top-level path", () => {
    expect(parentDirectory("forest.png")).toBe("");
  });

  it("returns the immediate parent for a path one level deep", () => {
    expect(parentDirectory("tiles/forest.png")).toBe("tiles");
  });

  it("returns the containing directory for a deeply nested path", () => {
    expect(parentDirectory("tiles/forest/forest-tile.png")).toBe("tiles/forest");
  });
});
