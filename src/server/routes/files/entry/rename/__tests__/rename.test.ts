import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HttpError } from "#server/errors/index.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";
import { renameEntry } from "../index.ts";

describe("renameEntry", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("renames a file within its own directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    await renameEntry(tempDir, "forest.png", "forest-renamed.png");

    await expect(fs.stat(path.join(tempDir, "forest.png"))).rejects.toThrow();
    expect((await fs.stat(path.join(tempDir, "forest-renamed.png"))).isFile()).toBe(true);
  });

  it("renames an entry nested in a subdirectory, keeping it in that directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));
    await fs.mkdir(path.join(tempDir, "tiles"));
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");

    await renameEntry(tempDir, "tiles/forest.png", "forest-renamed.png");

    expect((await fs.stat(path.join(tempDir, "tiles", "forest-renamed.png"))).isFile()).toBe(true);
  });

  it("rejects when the new name already exists in that directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));
    await fs.writeFile(path.join(tempDir, "a.png"), "a");
    await fs.writeFile(path.join(tempDir, "b.png"), "b");

    await expect(renameEntry(tempDir, "a.png", "b.png")).rejects.toThrow(HttpError);
  });

  it("rejects a new name that tries to escape the current directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));
    await fs.mkdir(path.join(tempDir, "tiles"));
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");

    await expect(renameEntry(tempDir, "tiles/forest.png", "../../escaped.png")).rejects.toThrow(
      UnsafePathError,
    );
  });

  it("rejects an unsafe current path", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));

    await expect(renameEntry(tempDir, "../escaped.png", "renamed.png")).rejects.toThrow(
      UnsafePathError,
    );
  });
});
