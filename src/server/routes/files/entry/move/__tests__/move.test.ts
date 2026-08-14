import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HttpError } from "#server/errors/index.ts";
import { UnsafePathError } from "#server/utils/safePath.ts";
import { moveEntry } from "../index.ts";

describe("moveEntry", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("renames a file within the same directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "move-entry-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    await moveEntry(tempDir, "forest.png", "forest-renamed.png");

    await expect(fs.stat(path.join(tempDir, "forest.png"))).rejects.toThrow();
    expect((await fs.stat(path.join(tempDir, "forest-renamed.png"))).isFile()).toBe(true);
  });

  it("moves a file into a new directory, creating it as needed", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "move-entry-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    await moveEntry(tempDir, "forest.png", "tiles/forest.png");

    expect((await fs.stat(path.join(tempDir, "tiles", "forest.png"))).isFile()).toBe(true);
  });

  it("rejects when the destination already exists", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "move-entry-"));
    await fs.writeFile(path.join(tempDir, "a.png"), "a");
    await fs.writeFile(path.join(tempDir, "b.png"), "b");

    await expect(moveEntry(tempDir, "a.png", "b.png")).rejects.toThrow(HttpError);
  });

  it("rejects a path that escapes the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "move-entry-"));
    await fs.writeFile(path.join(tempDir, "a.png"), "a");

    await expect(moveEntry(tempDir, "a.png", "../escaped.png")).rejects.toThrow(UnsafePathError);
  });
});
