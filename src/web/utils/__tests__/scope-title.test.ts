import { describe, expect, it } from "vitest";

import { describeScopedTitle } from "../scope-title.ts";

describe("describeScopedTitle", () => {
  it("names the folder when the scope is folder or subtree", () => {
    expect(describeScopedTitle("Sync changes", "folder", "tiles")).toBe("Sync changes in tiles");
    expect(describeScopedTitle("Sync changes", "subtree", "tiles")).toBe("Sync changes in tiles");
  });

  it("says root instead of an empty directory label", () => {
    expect(describeScopedTitle("Sync changes", "folder", "")).toBe("Sync changes in root");
  });

  it("says across all folders when the scope is all", () => {
    expect(describeScopedTitle("Sync changes", "all", "tiles")).toBe(
      "Sync changes across all folders",
    );
  });
});
