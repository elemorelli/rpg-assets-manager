import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { walkAssetTree } from "../walkAssetTree.ts";

describe("walkAssetTree", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("lists every file with its size, using forward-slash relative paths", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "walk-asset-tree-"));

    const forestPngContent = "fake-png-bytes";
    const rootFileContent = "hello";

    await fs.mkdir(path.join(tempDir, "tiles"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), forestPngContent);
    await fs.writeFile(path.join(tempDir, "root-file.txt"), rootFileContent);

    const files = await walkAssetTree(tempDir);
    const byPath = new Map(files.map((file) => [file.relativePath, file]));

    expect(files).toHaveLength(2);
    expect(byPath.get("tiles/forest.png")?.size).toBe(Buffer.byteLength(forestPngContent));
    expect(byPath.get("root-file.txt")?.size).toBe(Buffer.byteLength(rootFileContent));
    expect(byPath.get("tiles/forest.png")?.mtimeMs).toBeGreaterThan(0);
  });

  it("returns an empty list for an empty directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "walk-asset-tree-"));

    const files = await walkAssetTree(tempDir);

    expect(files).toEqual([]);
  });

  it("includes dotfiles such as .skip", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "walk-asset-tree-"));

    await fs.mkdir(path.join(tempDir, "tiles", "legacy-pack"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tiles", "legacy-pack", ".skip"), "");

    const files = await walkAssetTree(tempDir);

    expect(files.map((file) => file.relativePath)).toEqual(["tiles/legacy-pack/.skip"]);
  });
});
