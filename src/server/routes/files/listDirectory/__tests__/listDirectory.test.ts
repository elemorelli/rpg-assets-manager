import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { UnsafePathError } from "../../../../utils/safePath.ts";
import { listDirectory } from "../index.ts";

describe("listDirectory", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("lists files and directories at the root, directories first", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    await fs.mkdir(path.join(tempDir, "tiles"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    const entries = await listDirectory(tempDir, "");

    expect(entries).toEqual([
      { name: "tiles", type: "directory" },
      { name: "forest.png", type: "file", size: 14, mtimeMs: expect.any(Number) },
    ]);
  });

  it("lists the contents of a nested directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    await fs.mkdir(path.join(tempDir, "tiles"));
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");

    const entries = await listDirectory(tempDir, "tiles");

    expect(entries).toEqual([
      { name: "forest.png", type: "file", size: 14, mtimeMs: expect.any(Number) },
    ]);
  });

  it("returns an empty list for an empty directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    const entries = await listDirectory(tempDir, "");

    expect(entries).toEqual([]);
  });

  it("rejects a path that escapes the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    await expect(listDirectory(tempDir, "../../etc")).rejects.toThrow(UnsafePathError);
  });
});
