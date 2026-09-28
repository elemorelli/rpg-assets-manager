import { describe, expect, it } from "vitest";

import { buildZipFileName, planZipEntries } from "../zip-plan.ts";

describe("planZipEntries", () => {
  it("places a selected file at the archive root under its own name", () => {
    const plan = planZipEntries([{ type: "file", relativePath: "maps/forest.png" }]);

    expect(plan).toEqual([{ relativePath: "maps/forest.png", archivePath: "forest.png" }]);
  });

  it("nests a selected directory's files under the directory name", () => {
    const plan = planZipEntries([
      {
        type: "directory",
        relativePath: "maps/tiles",
        nestedFiles: ["grass.png", "forest/oak.png"],
      },
    ]);

    expect(plan).toEqual([
      { relativePath: "maps/tiles/grass.png", archivePath: "tiles/grass.png" },
      { relativePath: "maps/tiles/forest/oak.png", archivePath: "tiles/forest/oak.png" },
    ]);
  });

  it("combines files and directories in selection order", () => {
    const plan = planZipEntries([
      { type: "directory", relativePath: "maps/tiles", nestedFiles: ["grass.png"] },
      { type: "file", relativePath: "maps/forest.png" },
    ]);

    expect(plan.map((entry) => entry.archivePath)).toEqual(["tiles/grass.png", "forest.png"]);
  });

  it("disambiguates top-level names that collide across different parents", () => {
    const plan = planZipEntries([
      { type: "file", relativePath: "maps/forest.png" },
      { type: "file", relativePath: "tokens/forest.png" },
      { type: "directory", relativePath: "maps/tiles", nestedFiles: ["a.png"] },
      { type: "directory", relativePath: "tokens/tiles", nestedFiles: ["b.png"] },
    ]);

    expect(plan.map((entry) => entry.archivePath)).toEqual([
      "forest.png",
      "forest (2).png",
      "tiles/a.png",
      "tiles (2)/b.png",
    ]);
  });

  it("returns no entries for an empty directory", () => {
    const plan = planZipEntries([{ type: "directory", relativePath: "maps", nestedFiles: [] }]);

    expect(plan).toEqual([]);
  });
});

describe("buildZipFileName", () => {
  it("names a single selection after the entry itself", () => {
    expect(buildZipFileName(["maps/tiles"])).toBe("tiles.zip");
  });

  it("names a multi-selection after the directory that contains it, marked as a selection", () => {
    expect(buildZipFileName(["maps/tiles", "maps/forest.png"])).toBe("maps-selection.zip");
  });

  it("falls back to a generic name for a multi-selection at the tree root", () => {
    expect(buildZipFileName(["tiles", "forest.png"])).toBe("assets-selection.zip");
  });
});
