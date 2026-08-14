import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HttpError } from "#server/errors/index.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";
import { deleteEntry } from "../index.ts";

describe("deleteEntry", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("deletes a file", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    await deleteEntry(tempDir, "forest.png");

    await expect(fs.stat(path.join(tempDir, "forest.png"))).rejects.toThrow();
  });

  it("deletes a directory and its contents", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));
    await fs.mkdir(path.join(tempDir, "tiles"));
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");

    await deleteEntry(tempDir, "tiles");

    await expect(fs.stat(path.join(tempDir, "tiles"))).rejects.toThrow();
  });

  it("rejects deleting the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));

    await expect(deleteEntry(tempDir, "")).rejects.toThrow(HttpError);
  });

  it("rejects a path that escapes the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));

    await expect(deleteEntry(tempDir, "../escaped")).rejects.toThrow(UnsafePathError);
  });
});
