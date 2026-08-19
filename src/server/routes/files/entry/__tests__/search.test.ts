import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { searchEntries } from "../search-entries.ts";

describe("searchEntries", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("finds files and directories by name across nested directories", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "search-entries-"));
    await fs.mkdir(path.join(tempDir, "tiles", "forest"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tiles", "forest", "forest-tile.png"), "x");
    await fs.writeFile(path.join(tempDir, "map.png"), "x");

    const results = await searchEntries(tempDir, "forest");

    expect(results).toEqual([
      { relativePath: "tiles/forest", type: "directory" },
      { relativePath: "tiles/forest/forest-tile.png", type: "file" },
    ]);
  });

  it("returns an empty array for a blank query without walking further than needed", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "search-entries-"));
    await fs.writeFile(path.join(tempDir, "map.png"), "x");

    const results = await searchEntries(tempDir, "  ");

    expect(results).toEqual([]);
  });
});
