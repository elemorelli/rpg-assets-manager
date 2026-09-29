import { describe, expect, it } from "vitest";

import { findEmptyDirectories } from "../empty-directories.ts";

describe("findEmptyDirectories", () => {
  it("returns a directory with no entries at all", () => {
    const entries = [
      { relativePath: "tiles", isDirectory: true },
      { relativePath: "tiles/forest.png", isDirectory: false },
      { relativePath: "unused", isDirectory: true },
    ];

    expect(findEmptyDirectories(entries)).toEqual(["unused"]);
  });

  it("treats a directory that only holds empty directories as empty, deepest first", () => {
    const entries = [
      { relativePath: "old", isDirectory: true },
      { relativePath: "old/a", isDirectory: true },
      { relativePath: "old/a/b", isDirectory: true },
    ];

    expect(findEmptyDirectories(entries)).toEqual(["old/a/b", "old/a", "old"]);
  });

  it("keeps every ancestor of a file, even deeply nested", () => {
    const entries = [
      { relativePath: "maps", isDirectory: true },
      { relativePath: "maps/dungeon", isDirectory: true },
      { relativePath: "maps/dungeon/level-1", isDirectory: true },
      { relativePath: "maps/dungeon/level-1/boss.webp", isDirectory: false },
      { relativePath: "maps/dungeon/level-2", isDirectory: true },
    ];

    expect(findEmptyDirectories(entries)).toEqual(["maps/dungeon/level-2"]);
  });

  it("counts a hidden file as content, so its directory is not empty", () => {
    const entries = [
      { relativePath: "audio", isDirectory: true },
      { relativePath: "audio/.DS_Store", isDirectory: false },
    ];

    expect(findEmptyDirectories(entries)).toEqual([]);
  });

  it("returns nothing for an empty tree", () => {
    expect(findEmptyDirectories([])).toEqual([]);
  });
});
