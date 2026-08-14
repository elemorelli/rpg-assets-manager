import { describe, expect, it } from "vitest";
import { type DirectoryEntry, sortDirectoryEntries } from "../directoryListing.ts";

describe("sortDirectoryEntries", () => {
  it("puts directories before files regardless of input order", () => {
    const entries: DirectoryEntry[] = [
      { name: "forest.png", type: "file" },
      { name: "tiles", type: "directory" },
    ];

    expect(sortDirectoryEntries(entries).map((entry) => entry.name)).toEqual([
      "tiles",
      "forest.png",
    ]);
  });

  it("sorts each group alphabetically", () => {
    const entries: DirectoryEntry[] = [
      { name: "zebra", type: "directory" },
      { name: "apple", type: "directory" },
      { name: "z.png", type: "file" },
      { name: "a.png", type: "file" },
    ];

    expect(sortDirectoryEntries(entries).map((entry) => entry.name)).toEqual([
      "apple",
      "zebra",
      "a.png",
      "z.png",
    ]);
  });

  it("sorts case-insensitively", () => {
    const entries: DirectoryEntry[] = [
      { name: "Banana.png", type: "file" },
      { name: "apple.png", type: "file" },
    ];

    expect(sortDirectoryEntries(entries).map((entry) => entry.name)).toEqual([
      "apple.png",
      "Banana.png",
    ]);
  });

  it("returns an empty list for an empty input", () => {
    expect(sortDirectoryEntries([])).toEqual([]);
  });
});
