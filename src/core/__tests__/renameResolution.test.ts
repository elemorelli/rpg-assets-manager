import { describe, expect, it } from "vitest";
import { resolveRenames } from "../renameResolution.ts";

describe("resolveRenames", () => {
  it("resolves an unambiguous rename when exactly one candidate exists on each side", () => {
    const groups = [
      {
        hash: "hash-a",
        local: [{ path: "tiles/forest-v2.png", hash: "hash-a" }],
        remote: [{ path: "tiles/forest.png", hash: "hash-a" }],
      },
    ];

    const result = resolveRenames(groups);

    expect(result.renamed).toEqual([
      { oldPath: "tiles/forest.png", newPath: "tiles/forest-v2.png" },
    ]);
    expect(result.added).toEqual([]);
    expect(result.deleted).toEqual([]);
    expect(result.ambiguousWarnings).toEqual([]);
  });

  it("treats a local-only hash as a plain addition", () => {
    const groups = [
      { hash: "hash-b", local: [{ path: "tiles/new.png", hash: "hash-b" }], remote: [] },
    ];

    const result = resolveRenames(groups);

    expect(result.added).toEqual(["tiles/new.png"]);
    expect(result.renamed).toEqual([]);
  });

  it("treats a remote-only hash as a plain deletion", () => {
    const groups = [
      { hash: "hash-c", local: [], remote: [{ path: "tiles/gone.png", hash: "hash-c" }] },
    ];

    const result = resolveRenames(groups);

    expect(result.deleted).toEqual(["tiles/gone.png"]);
    expect(result.renamed).toEqual([]);
  });

  it("resolves a confident filename match and leaves the remainder as an ambiguous warning", () => {
    const groups = [
      {
        hash: "hash-e",
        local: [
          { path: "newdir/keep.png", hash: "hash-e" },
          { path: "newdir/mystery-a.png", hash: "hash-e" },
        ],
        remote: [
          { path: "olddir/keep.png", hash: "hash-e" },
          { path: "olddir/mystery-b.png", hash: "hash-e" },
        ],
      },
    ];

    const result = resolveRenames(groups);

    expect(result.renamed).toEqual([{ oldPath: "olddir/keep.png", newPath: "newdir/keep.png" }]);
    expect(result.ambiguousWarnings).toEqual([
      {
        hash: "hash-e",
        localPaths: ["newdir/mystery-a.png"],
        remotePaths: ["olddir/mystery-b.png"],
      },
    ]);
    expect(result.added).toEqual(["newdir/mystery-a.png"]);
    expect(result.deleted).toEqual(["olddir/mystery-b.png"]);
  });

  it("flags a fully ambiguous group with no filename hints as a warning, resolved as delete plus add", () => {
    const groups = [
      {
        hash: "hash-f",
        local: [
          { path: "a/one.png", hash: "hash-f" },
          { path: "a/two.png", hash: "hash-f" },
        ],
        remote: [
          { path: "b/three.png", hash: "hash-f" },
          { path: "b/four.png", hash: "hash-f" },
        ],
      },
    ];

    const result = resolveRenames(groups);

    expect(result.renamed).toEqual([]);
    expect(result.ambiguousWarnings).toEqual([
      {
        hash: "hash-f",
        localPaths: ["a/one.png", "a/two.png"],
        remotePaths: ["b/three.png", "b/four.png"],
      },
    ]);
    expect(result.added).toEqual(["a/one.png", "a/two.png"]);
    expect(result.deleted).toEqual(["b/three.png", "b/four.png"]);
  });
});
