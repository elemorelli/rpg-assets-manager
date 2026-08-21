import { describe, expect, it } from "vitest";

import { pathMatchesScope } from "../operation-scope.ts";

describe("pathMatchesScope", () => {
  it("matches every path when the scope is all, regardless of relativeDir", () => {
    expect(pathMatchesScope("tiles/forest.png", "all", "monsters")).toBe(true);
    expect(pathMatchesScope("root-file.txt", "all", "")).toBe(true);
  });

  describe("scope: subtree", () => {
    it("matches direct children and deeper descendants of relativeDir", () => {
      expect(pathMatchesScope("tiles/forest.png", "subtree", "tiles")).toBe(true);
      expect(pathMatchesScope("tiles/legacy/forest.png", "subtree", "tiles")).toBe(true);
    });

    it("does not match paths outside relativeDir", () => {
      expect(pathMatchesScope("monsters/goblin.png", "subtree", "tiles")).toBe(false);
      expect(pathMatchesScope("tiles-old/forest.png", "subtree", "tiles")).toBe(false);
    });

    it("matches every path when relativeDir is the root", () => {
      expect(pathMatchesScope("tiles/forest.png", "subtree", "")).toBe(true);
      expect(pathMatchesScope("root-file.txt", "subtree", "")).toBe(true);
    });
  });

  describe("scope: folder", () => {
    it("matches only direct children of relativeDir", () => {
      expect(pathMatchesScope("tiles/forest.png", "folder", "tiles")).toBe(true);
    });

    it("does not match deeper descendants of relativeDir", () => {
      expect(pathMatchesScope("tiles/legacy/forest.png", "folder", "tiles")).toBe(false);
    });

    it("does not match paths outside relativeDir", () => {
      expect(pathMatchesScope("monsters/goblin.png", "folder", "tiles")).toBe(false);
    });

    it("matches only root-level files when relativeDir is the root", () => {
      expect(pathMatchesScope("root-file.txt", "folder", "")).toBe(true);
      expect(pathMatchesScope("tiles/forest.png", "folder", "")).toBe(false);
    });
  });
});
