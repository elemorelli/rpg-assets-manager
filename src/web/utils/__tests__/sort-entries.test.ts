import { describe, expect, it } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { getNextSort, sortEntries } from "../sort-entries.ts";

const dir = (name: string): DirectoryEntry => ({ name, type: "directory" });
const file = (name: string, size: number): DirectoryEntry => ({ name, type: "file", size });

const SMALL_FILE_SIZE_BYTES = 10;
const LARGE_FILE_SIZE_BYTES = 300;
const OTHER_SMALL_FILE_SIZE_BYTES = 20;

describe("sortEntries", () => {
  it("keeps directories before files regardless of criterion", () => {
    const entries = [
      file("b.png", SMALL_FILE_SIZE_BYTES),
      dir("zzz"),
      file("a.png", OTHER_SMALL_FILE_SIZE_BYTES),
    ];

    const sorted = sortEntries(entries, "size", "asc");

    expect(sorted.map((entry) => entry.name)).toEqual(["zzz", "b.png", "a.png"]);
  });

  it("sorts files by name case-insensitively", () => {
    const entries = [file("Banana.png", 1), file("apple.png", 1)];

    expect(sortEntries(entries, "name", "asc").map((entry) => entry.name)).toEqual([
      "apple.png",
      "Banana.png",
    ]);
  });

  it("sorts files by size ascending", () => {
    const entries = [
      file("big.png", LARGE_FILE_SIZE_BYTES),
      file("small.png", SMALL_FILE_SIZE_BYTES),
    ];

    expect(sortEntries(entries, "size", "asc").map((entry) => entry.name)).toEqual([
      "small.png",
      "big.png",
    ]);
  });

  it("sorts files by size descending", () => {
    const entries = [
      file("big.png", LARGE_FILE_SIZE_BYTES),
      file("small.png", SMALL_FILE_SIZE_BYTES),
    ];

    expect(sortEntries(entries, "size", "desc").map((entry) => entry.name)).toEqual([
      "big.png",
      "small.png",
    ]);
  });

  it("sorts files by extension, tie-broken by name", () => {
    const entries = [file("b.wav", 1), file("a.png", 1), file("z.png", 1)];

    expect(sortEntries(entries, "type", "asc").map((entry) => entry.name)).toEqual([
      "a.png",
      "z.png",
      "b.wav",
    ]);
  });

  it("reverses directory order too when direction is descending", () => {
    const entries = [dir("alpha"), dir("beta")];

    expect(sortEntries(entries, "name", "desc").map((entry) => entry.name)).toEqual([
      "beta",
      "alpha",
    ]);
  });

  it("treats a file with no extension as sorting before any dotted extension in ascending order", () => {
    const entries = [file("README", 1), file("a.png", 1)];

    expect(sortEntries(entries, "type", "asc").map((entry) => entry.name)).toEqual([
      "README",
      "a.png",
    ]);
  });
});

describe("getNextSort", () => {
  it("switches to the clicked criterion and resets to ascending when it differs from the current one", () => {
    expect(getNextSort("size", { criterion: "name", direction: "desc" })).toEqual({
      criterion: "size",
      direction: "asc",
    });
  });

  it("toggles from ascending to descending when the clicked criterion is already active", () => {
    expect(getNextSort("name", { criterion: "name", direction: "asc" })).toEqual({
      criterion: "name",
      direction: "desc",
    });
  });

  it("toggles from descending to ascending when the clicked criterion is already active", () => {
    expect(getNextSort("name", { criterion: "name", direction: "desc" })).toEqual({
      criterion: "name",
      direction: "asc",
    });
  });
});
