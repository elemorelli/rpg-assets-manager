import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { walkDirectory } from "../walk-directory.ts";

describe("walkDirectory", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("lists every file and directory across nested subdirectories, recursive by default", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "walk-directory-"));
    await fs.mkdir(path.join(tempDir, "tiles", "legacy-pack"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "audio"));
    await fs.writeFile(path.join(tempDir, "map.png"), "fake-png-bytes");
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");
    await fs.writeFile(path.join(tempDir, "tiles", "legacy-pack", "ruin.png"), "fake-png-bytes");

    const entries = await walkDirectory(tempDir);
    const relativePaths = entries.map((entry) => entry.relativePath).sort();

    expect(relativePaths).toEqual(
      [
        "audio",
        "map.png",
        "tiles",
        "tiles/forest.png",
        "tiles/legacy-pack",
        "tiles/legacy-pack/ruin.png",
      ].sort(),
    );
  });

  it("does not descend into subdirectories when recursive is false", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "walk-directory-"));
    await fs.mkdir(path.join(tempDir, "tiles"));
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");
    await fs.writeFile(path.join(tempDir, "map.png"), "fake-png-bytes");

    const entries = await walkDirectory(tempDir, { recursive: false });
    const relativePaths = entries.map((entry) => entry.relativePath).sort();

    expect(relativePaths).toEqual(["map.png", "tiles"]);
  });

  it("sets entryPath to the absolute path of each entry", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "walk-directory-"));
    await fs.writeFile(path.join(tempDir, "map.png"), "fake-png-bytes");

    const entries = await walkDirectory(tempDir);

    expect(entries).toEqual([
      {
        relativePath: "map.png",
        entryPath: path.join(tempDir, "map.png"),
        dirent: expect.anything(),
      },
    ]);
  });

  it("returns nothing for an empty directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "walk-directory-"));

    const entries = await walkDirectory(tempDir);

    expect(entries).toEqual([]);
  });
});
