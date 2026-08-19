import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { listDirectory } from "../list.ts";

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

  it("attaches the recursive total size to a directory entry from the directories table", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    await fs.mkdir(path.join(tempDir, "tiles"));

    const SEEDED_TOTAL_SIZE = 42;

    db.seed("directories", [
      {
        id: "1",
        path: "tiles",
        parent_id: null,
        total_size: SEEDED_TOTAL_SIZE,
        file_count: 3,
        folder_count: 0,
      },
    ]);

    const entries = await listDirectory(db, tempDir, "");
    const tiles = entries.find((entry) => entry.name === "tiles");

    expect(tiles?.size).toBe(SEEDED_TOTAL_SIZE);
  });

  it("leaves a directory entry's size unset when it has no aggregate row yet", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    await fs.mkdir(path.join(tempDir, "tiles"));

    const entries = await listDirectory(db, tempDir, "");
    const tiles = entries.find((entry) => entry.name === "tiles");

    expect(tiles?.size).toBeUndefined();
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

  it("marks a file as pending when its local hash differs from the remote hash", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-sync-test-"));

    await fs.writeFile(path.join(tempDir, "changed.png"), "x");
    await fs.writeFile(path.join(tempDir, "unchanged.png"), "x");

    db.seed("assets", [
      { id: "1", path: "changed.png", size: 1, hash: "local-hash" },
      { id: "2", path: "unchanged.png", size: 1, hash: "same-hash" },
    ]);
    db.seed("remote_assets", [
      { id: "1", path: "changed.png", size: 1, hash: "remote-hash" },
      { id: "2", path: "unchanged.png", size: 1, hash: "same-hash" },
    ]);

    const entries = await listDirectory(db, tempDir, "");
    const changed = entries.find((entry) => entry.name === "changed.png");
    const unchanged = entries.find((entry) => entry.name === "unchanged.png");

    expect(changed?.syncStatus).toBe("pending");
    expect(unchanged?.syncStatus).toBeUndefined();
  });

  it("includes a synthetic entry for a file that was deleted locally but still exists remotely", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-deleted-test-"));

    db.seed("remote_assets", [{ id: "1", path: "gone.png", size: 42, hash: "remote-hash" }]);

    const entries = await listDirectory(db, tempDir, "");

    expect(entries).toEqual([{ name: "gone.png", type: "file", size: 42, syncStatus: "deleted" }]);
  });

  it("marks a file as new when it has no remote counterpart", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-new-test-"));

    await fs.writeFile(path.join(tempDir, "brand-new.png"), "x");

    db.seed("assets", [{ id: "1", path: "brand-new.png", size: 1, hash: "local-hash" }]);

    const entries = await listDirectory(db, tempDir, "");
    const brandNew = entries.find((entry) => entry.name === "brand-new.png");

    expect(brandNew?.syncStatus).toBe("new");
  });

  it("treats a renamed file as renamed rather than new, and hides its old remote path", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-rename-test-"));

    await fs.writeFile(path.join(tempDir, "renamed.png"), "x");

    db.seed("assets", [{ id: "1", path: "renamed.png", size: 1, hash: "shared-hash" }]);
    db.seed("remote_assets", [{ id: "1", path: "old-name.png", size: 1, hash: "shared-hash" }]);

    const entries = await listDirectory(db, tempDir, "");
    const renamed = entries.find((entry) => entry.name === "renamed.png");
    const oldEntry = entries.find((entry) => entry.name === "old-name.png");

    expect(renamed?.syncStatus).toBe("renamed");
    expect(oldEntry).toBeUndefined();
  });

  it("marks a directory as having pending sync when a nested descendant changed", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-nested-sync-test-"));

    await fs.mkdir(path.join(tempDir, "tiles", "forests"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tiles", "forests", "leaf.png"), "x");

    db.seed("assets", [{ id: "1", path: "tiles/forests/leaf.png", size: 1, hash: "local-hash" }]);
    db.seed("remote_assets", [
      { id: "1", path: "tiles/forests/leaf.png", size: 1, hash: "remote-hash" },
    ]);

    const entries = await listDirectory(db, tempDir, "");
    const tiles = entries.find((entry) => entry.name === "tiles");

    expect(tiles?.hasPendingSync).toBe(true);
  });

  it("reuses the cached remote index across repeated calls, so a direct db write bypassing invalidation is not reflected", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");
    await db
      .insertInto("assets")
      .values({ path: "forest.png", size: 14, mtime: new Date(), hash: "same-hash" })
      .execute();
    await db
      .insertInto("remote_assets")
      .values({ path: "forest.png", size: 14, hash: "same-hash" })
      .execute();

    const first = await listDirectory(db, tempDir, "");
    expect(first.find((entry) => entry.name === "forest.png")?.syncStatus).toBeUndefined();

    await db
      .updateTable("remote_assets")
      .set({ hash: "different-hash" })
      .where("path", "=", "forest.png")
      .execute();
    const second = await listDirectory(db, tempDir, "");

    expect(second.find((entry) => entry.name === "forest.png")?.syncStatus).toBeUndefined();
  });
});
