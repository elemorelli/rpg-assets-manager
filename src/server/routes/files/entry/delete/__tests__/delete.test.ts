import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLocalHashIndex } from "#server/asset-index-cache/index.ts";
import { HttpError } from "#server/errors/index.ts";
import { createFakeDb } from "#server/test-utils/fake-db.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { deleteEntry } from "../delete-entry.ts";

const PREFIX = "delete-entry-test/";

describe("deleteEntry", () => {
  let tempDir = "";
  let db: ReturnType<typeof createFakeDb>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));
    db = createFakeDb();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("deletes a file", async () => {
    await fs.mkdir(path.join(tempDir, "delete-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "forest.png"), "fake-png-bytes");

    await deleteEntry(db, tempDir, `${PREFIX}forest.png`);

    await expect(fs.stat(path.join(tempDir, "delete-entry-test", "forest.png"))).rejects.toThrow();
  });

  it("deletes a directory and its contents", async () => {
    await fs.mkdir(path.join(tempDir, "delete-entry-test", "tiles"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "delete-entry-test", "tiles", "forest.png"),
      "fake-png-bytes",
    );

    await deleteEntry(db, tempDir, `${PREFIX}tiles`);

    await expect(fs.stat(path.join(tempDir, "delete-entry-test", "tiles"))).rejects.toThrow();
  });

  it("rejects deleting the tree root", async () => {
    await expect(deleteEntry(db, tempDir, "")).rejects.toThrow(HttpError);
  });

  it("rejects a path that escapes the tree root", async () => {
    await expect(deleteEntry(db, tempDir, "../escaped")).rejects.toThrow(UnsafePathError);
  });

  it("removes the assets row for a deleted file", async () => {
    await fs.mkdir(path.join(tempDir, "delete-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "forest.png"), "fake-png-bytes");
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}forest.png`, size: 14, mtime: new Date(), hash: "known-hash" })
      .execute();

    await deleteEntry(db, tempDir, `${PREFIX}forest.png`);

    const row = await db
      .selectFrom("assets")
      .select("id")
      .where("path", "=", `${PREFIX}forest.png`)
      .executeTakeFirst();

    expect(row).toBeUndefined();
  });

  it("removes the assets rows for every file nested under a deleted directory", async () => {
    await fs.mkdir(path.join(tempDir, "delete-entry-test", "tiles", "forest"), {
      recursive: true,
    });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "tiles", "a.png"), "a");
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "tiles", "forest", "b.png"), "b");
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}tiles/a.png`, size: 1, mtime: new Date(), hash: "hash-a" })
      .execute();
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}tiles/forest/b.png`, size: 1, mtime: new Date(), hash: "hash-b" })
      .execute();

    await deleteEntry(db, tempDir, `${PREFIX}tiles`);

    const remainingRows = await db
      .selectFrom("assets")
      .select("path")
      .where("path", "like", `${PREFIX}%`)
      .execute();

    expect(remainingRows).toEqual([]);
  });

  it("subtracts a deleted file's size from the parent directory's aggregate", async () => {
    await fs.mkdir(path.join(tempDir, "delete-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "forest.png"), "fake-png-bytes");
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}forest.png`, size: 14, mtime: new Date(), hash: "known-hash" })
      .execute();
    await db
      .insertInto("directories")
      .values({ path: "", parent_id: null, total_size: 14, file_count: 1, folder_count: 1 })
      .execute();
    await db
      .insertInto("directories")
      .values({
        path: "delete-entry-test",
        parent_id: null,
        total_size: 14,
        file_count: 1,
        folder_count: 0,
      })
      .execute();

    await deleteEntry(db, tempDir, `${PREFIX}forest.png`);

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("delete-entry-test")).toMatchObject({ total_size: 0, file_count: 0 });
    expect(byPath.get("")).toMatchObject({ total_size: 0, file_count: 0 });
  });

  it("removes the deleted directory's own row, its descendants, and subtracts its contribution from the parent", async () => {
    await fs.mkdir(path.join(tempDir, "delete-entry-test", "tiles", "forest"), {
      recursive: true,
    });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "tiles", "a.png"), "a");
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "tiles", "forest", "b.png"), "b");
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}tiles/a.png`, size: 1, mtime: new Date(), hash: "hash-a" })
      .execute();
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}tiles/forest/b.png`, size: 1, mtime: new Date(), hash: "hash-b" })
      .execute();
    await db
      .insertInto("directories")
      .values({ path: "", parent_id: null, total_size: 2, file_count: 2, folder_count: 3 })
      .execute();
    await db
      .insertInto("directories")
      .values({
        path: "delete-entry-test",
        parent_id: null,
        total_size: 2,
        file_count: 2,
        folder_count: 2,
      })
      .execute();
    await db
      .insertInto("directories")
      .values({
        path: "delete-entry-test/tiles",
        parent_id: null,
        total_size: 2,
        file_count: 2,
        folder_count: 1,
      })
      .execute();
    await db
      .insertInto("directories")
      .values({
        path: "delete-entry-test/tiles/forest",
        parent_id: null,
        total_size: 1,
        file_count: 1,
        folder_count: 0,
      })
      .execute();

    await deleteEntry(db, tempDir, `${PREFIX}tiles`);

    const remainingPaths = db.rows("directories").map((row) => row.path);

    expect(remainingPaths).not.toContain("delete-entry-test/tiles");
    expect(remainingPaths).not.toContain("delete-entry-test/tiles/forest");

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("delete-entry-test")).toMatchObject({
      total_size: 0,
      file_count: 0,
      folder_count: 0,
    });
    expect(byPath.get("")).toMatchObject({ total_size: 0, file_count: 0, folder_count: 1 });
  });

  it("invalidates the cached local hash index so a deleted path is no longer present", async () => {
    await fs.mkdir(path.join(tempDir, "delete-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "forest.png"), "fake-png-bytes");
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}forest.png`, size: 14, mtime: new Date(), hash: "known-hash" })
      .execute();

    await getLocalHashIndex(db);
    await deleteEntry(db, tempDir, `${PREFIX}forest.png`);
    const index = await getLocalHashIndex(db);

    expect(index.has(`${PREFIX}forest.png`)).toBe(false);
  });
});
