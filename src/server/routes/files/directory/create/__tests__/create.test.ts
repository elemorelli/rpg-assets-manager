import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { createDirectory } from "../create-directory.ts";

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
    const db = createFakeDb();

    await createDirectory(db, tempDir, "tiles");

    const stat = await fs.stat(path.join(tempDir, "tiles"));

    expect(stat.isDirectory()).toBe(true);
  });

  it("rejects a path that escapes the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));
    const db = createFakeDb();

    await expect(createDirectory(db, tempDir, "../escaped")).rejects.toThrow(UnsafePathError);
  });

  it("throws when the directory already exists", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));
    await fs.mkdir(path.join(tempDir, "tiles"));
    const db = createFakeDb();

    await expect(createDirectory(db, tempDir, "tiles")).rejects.toThrow();
  });

  it("creates a directory row for the new directory itself", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));
    const db = createFakeDb();

    await createDirectory(db, tempDir, "tiles");

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("tiles")).toMatchObject({ total_size: 0, file_count: 0, folder_count: 0 });
  });

  it("increments folder_count on the parent and its ancestors, not on itself", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));
    const db = createFakeDb();

    await createDirectory(db, tempDir, "tiles");
    await createDirectory(db, tempDir, "tiles/forest");

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("")).toMatchObject({ folder_count: 2 });
    expect(byPath.get("tiles")).toMatchObject({ folder_count: 1 });
    expect(byPath.get("tiles/forest")).toMatchObject({ folder_count: 0 });
  });
});
