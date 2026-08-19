import { describe, expect, it } from "vitest";

import { collapseRenameChain } from "../collapse-rename-chain.ts";

describe("collapseRenameChain", () => {
  it("returns a single rename unchanged", () => {
    expect(collapseRenameChain([{ oldPath: "a.png", newPath: "b.png" }])).toEqual([
      { oldPath: "a.png", newPath: "b.png" },
    ]);
  });

  it("collapses a chain of renames into one net rename", () => {
    const result = collapseRenameChain([
      { oldPath: "a.png", newPath: "b.png" },
      { oldPath: "b.png", newPath: "c.png" },
    ]);

    expect(result).toEqual([{ oldPath: "a.png", newPath: "c.png" }]);
  });

  it("collapses a longer chain regardless of input order", () => {
    const result = collapseRenameChain([
      { oldPath: "c.png", newPath: "d.png" },
      { oldPath: "a.png", newPath: "b.png" },
      { oldPath: "b.png", newPath: "c.png" },
    ]);

    expect(result).toEqual([{ oldPath: "a.png", newPath: "d.png" }]);
  });

  it("keeps unrelated renames separate", () => {
    const result = collapseRenameChain([
      { oldPath: "a.png", newPath: "b.png" },
      { oldPath: "x.png", newPath: "y.png" },
    ]);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { oldPath: "a.png", newPath: "b.png" },
        { oldPath: "x.png", newPath: "y.png" },
      ]),
    );
  });

  it("returns an empty list unchanged", () => {
    expect(collapseRenameChain([])).toEqual([]);
  });

  it("leaves a cyclical swap unresolved instead of dropping it or looping forever", () => {
    const result = collapseRenameChain([
      { oldPath: "a.png", newPath: "b.png" },
      { oldPath: "b.png", newPath: "a.png" },
    ]);

    expect(result).toEqual(
      expect.arrayContaining([
        { oldPath: "a.png", newPath: "b.png" },
        { oldPath: "b.png", newPath: "a.png" },
      ]),
    );
    expect(result).toHaveLength(2);
  });
});
