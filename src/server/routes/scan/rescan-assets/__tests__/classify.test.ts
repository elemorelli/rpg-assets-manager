import { describe, expect, it } from "vitest";
import { classifyHashedCandidates } from "../classify.ts";

describe("classifyHashedCandidates", () => {
  it("treats a path that was already known as modified, never as a rename candidate", () => {
    const previous = [{ path: "tiles/forest.png", size: 10, mtimeMs: 1000, hash: "old-hash" }];
    const hashedCandidates = [
      { relativePath: "tiles/forest.png", size: 12, mtimeMs: 2000, hash: "new-hash" },
    ];

    const result = classifyHashedCandidates(previous, [], hashedCandidates);

    expect(result).toEqual({
      modified: hashedCandidates,
      renamePairs: [],
      added: [],
      removedPaths: [],
    });
  });

  it("pairs a removed path with a new path that shares its hash as a rename", () => {
    const previous = [{ path: "tiles/before.png", size: 10, mtimeMs: 1000, hash: "same-hash" }];
    const hashedCandidates = [
      { relativePath: "tiles/after.png", size: 10, mtimeMs: 2000, hash: "same-hash" },
    ];

    const result = classifyHashedCandidates(previous, ["tiles/before.png"], hashedCandidates);

    expect(result).toEqual({
      modified: [],
      renamePairs: [
        {
          oldPath: "tiles/before.png",
          newPath: "tiles/after.png",
          size: 10,
          mtimeMs: 2000,
          hash: "same-hash",
        },
      ],
      added: [],
      removedPaths: [],
    });
  });

  it("treats a new path with no hash match among removed paths as added", () => {
    const hashedCandidates = [
      { relativePath: "tiles/new.png", size: 5, mtimeMs: 1000, hash: "h1" },
    ];

    const result = classifyHashedCandidates([], [], hashedCandidates);

    expect(result).toEqual({
      modified: [],
      renamePairs: [],
      added: hashedCandidates,
      removedPaths: [],
    });
  });

  it("treats a removed path with no hash match among new paths as removed", () => {
    const previous = [{ path: "tiles/gone.png", size: 10, mtimeMs: 1000, hash: "h1" }];

    const result = classifyHashedCandidates(previous, ["tiles/gone.png"], []);

    expect(result).toEqual({
      modified: [],
      renamePairs: [],
      added: [],
      removedPaths: ["tiles/gone.png"],
    });
  });

  it("falls back to added/removed, never guesses, when a hash collision is ambiguous", () => {
    const previous = [
      { path: "tiles/dup-a.png", size: 10, mtimeMs: 1000, hash: "same-hash" },
      { path: "tiles/dup-b.png", size: 10, mtimeMs: 1000, hash: "same-hash" },
    ];
    const hashedCandidates = [
      { relativePath: "tiles/dup-c.png", size: 10, mtimeMs: 2000, hash: "same-hash" },
    ];

    const result = classifyHashedCandidates(
      previous,
      ["tiles/dup-a.png", "tiles/dup-b.png"],
      hashedCandidates,
    );

    expect(result.renamePairs).toEqual([]);
    expect(result.added).toEqual(hashedCandidates);
    expect(result.removedPaths.sort()).toEqual(["tiles/dup-a.png", "tiles/dup-b.png"]);
  });
});
