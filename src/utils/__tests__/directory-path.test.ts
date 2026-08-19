import { describe, expect, it } from "vitest";

import { getAncestorPaths, getParentPath } from "../directory-path.ts";

describe("getParentPath", () => {
  it("returns the empty string for a top-level file", () => {
    expect(getParentPath("forest.png")).toBe("");
  });

  it("returns the empty string for a top-level directory", () => {
    expect(getParentPath("tiles")).toBe("");
  });

  it("returns the immediate parent of a nested file", () => {
    expect(getParentPath("tiles/forest/a.png")).toBe("tiles/forest");
  });

  it("returns the immediate parent of a nested directory", () => {
    expect(getParentPath("tiles/forest")).toBe("tiles");
  });
});

describe("getAncestorPaths", () => {
  it("returns no ancestors for the root", () => {
    expect(getAncestorPaths("")).toEqual([]);
  });

  it("returns only the root for a top-level entry", () => {
    expect(getAncestorPaths("forest.png")).toEqual([""]);
  });

  it("returns every ancestor from immediate parent up to root, in that order", () => {
    expect(getAncestorPaths("tiles/forest/a.png")).toEqual(["tiles/forest", "tiles", ""]);
  });

  it("treats a directory path the same as a file path", () => {
    expect(getAncestorPaths("tiles/forest")).toEqual(["tiles", ""]);
  });
});
