import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { UnsafePathError } from "../../../../../utils/safePath.ts";
import { createDirectory } from "../index.ts";

describe("createDirectory", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("creates a new directory under the root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));

    await createDirectory(tempDir, "tiles");

    const stat = await fs.stat(path.join(tempDir, "tiles"));

    expect(stat.isDirectory()).toBe(true);
  });

  it("rejects a path that escapes the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));

    await expect(createDirectory(tempDir, "../escaped")).rejects.toThrow(UnsafePathError);
  });

  it("throws when the directory already exists", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));
    await fs.mkdir(path.join(tempDir, "tiles"));

    await expect(createDirectory(tempDir, "tiles")).rejects.toThrow();
  });
});
