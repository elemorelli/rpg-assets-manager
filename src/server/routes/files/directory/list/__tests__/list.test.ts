import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { listDirectory } from "../list-directory.ts";

describe("listDirectory", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("lists files and directories at the root, directories first", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    await fs.mkdir(path.join(tempDir, "tiles"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    const entries = await listDirectory(db, tempDir, "");

    expect(entries).toEqual([
      { name: "tiles", type: "directory" },
      { name: "forest.png", type: "file", size: 14, mtimeMs: expect.any(Number) },
    ]);
  });

  it("lists the contents of a nested directory", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    await fs.mkdir(path.join(tempDir, "tiles"));
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");

    const entries = await listDirectory(db, tempDir, "tiles");

    expect(entries).toEqual([
      { name: "forest.png", type: "file", size: 14, mtimeMs: expect.any(Number) },
    ]);
  });

  it("returns an empty list for an empty directory", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    const entries = await listDirectory(db, tempDir, "");

    expect(entries).toEqual([]);
  });

  it("rejects a path that escapes the tree root", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    await expect(listDirectory(db, tempDir, "../../etc")).rejects.toThrow(UnsafePathError);
  });

  it("includes tags for files that have them, and omits the field otherwise", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-tags-test-"));

    await fs.writeFile(path.join(tempDir, "tagged.png"), "x");
    await fs.writeFile(path.join(tempDir, "untagged.png"), "x");

    db.seed("assets", [{ id: "1", path: "tagged.png", size: 1, hash: "h1", tags: ["npc"] }]);

    const entries = await listDirectory(db, tempDir, "");
    const tagged = entries.find((entry) => entry.name === "tagged.png");
    const untagged = entries.find((entry) => entry.name === "untagged.png");

    expect(tagged?.tags).toEqual(["npc"]);
    expect(untagged?.tags).toBeUndefined();
  });
});
