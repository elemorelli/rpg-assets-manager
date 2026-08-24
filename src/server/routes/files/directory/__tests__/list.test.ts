import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Kysely } from "kysely";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { listDirectory } = await import("../list.ts");

const createMock = (): MockDb => {
  const mockDb = createMockDb();

  currentMockDb = mockDb;

  return mockDb as unknown as MockDb;
};

describe("listDirectory", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("lists files and directories at the root, directories first", async () => {
    const mock = createMock();

    mock.selectFrom("assets").execute.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);
    mock.selectFrom("directories").execute.mockResolvedValueOnce([]);

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
    const mock = createMock();

    mock.selectFrom("assets").execute.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    await fs.mkdir(path.join(tempDir, "tiles"));
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");

    const entries = await listDirectory(tempDir, "tiles");

    expect(entries).toEqual([
      { name: "forest.png", type: "file", size: 14, mtimeMs: expect.any(Number) },
    ]);
  });

  it("returns an empty list for an empty directory", async () => {
    const mock = createMock();

    mock.selectFrom("assets").execute.mockResolvedValueOnce([]);
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    const entries = await listDirectory(tempDir, "");

    expect(entries).toEqual([]);
  });

  it("attaches the recursive total size to a directory entry from the directories table", async () => {
    const mock = createMock();
    const SEEDED_TOTAL_SIZE = 42;

    mock.selectFrom("assets").execute.mockResolvedValueOnce([]);
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);
    mock
      .selectFrom("directories")
      .execute.mockResolvedValueOnce([{ path: "tiles", total_size: SEEDED_TOTAL_SIZE }]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));
    await fs.mkdir(path.join(tempDir, "tiles"));

    const entries = await listDirectory(tempDir, "");
    const tiles = entries.find((entry) => entry.name === "tiles");

    expect(tiles?.size).toBe(SEEDED_TOTAL_SIZE);
  });

  it("leaves a directory entry's size unset when it has no aggregate row yet", async () => {
    const mock = createMock();

    mock.selectFrom("assets").execute.mockResolvedValueOnce([]);
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);
    mock.selectFrom("directories").execute.mockResolvedValueOnce([]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));
    await fs.mkdir(path.join(tempDir, "tiles"));

    const entries = await listDirectory(tempDir, "");
    const tiles = entries.find((entry) => entry.name === "tiles");

    expect(tiles?.size).toBeUndefined();
  });

  it("rejects a path that escapes the tree root", async () => {
    createMock();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));

    await expect(listDirectory(tempDir, "../../etc")).rejects.toThrow(UnsafePathError);
  });

  it("includes tags for files that have them, and omits the field otherwise", async () => {
    const mock = createMock();

    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([{ path: "tagged.png", tags: ["npc"] }])
      .mockResolvedValueOnce([]);
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-tags-test-"));
    await fs.writeFile(path.join(tempDir, "tagged.png"), "x");
    await fs.writeFile(path.join(tempDir, "untagged.png"), "x");

    const entries = await listDirectory(tempDir, "");
    const tagged = entries.find((entry) => entry.name === "tagged.png");
    const untagged = entries.find((entry) => entry.name === "untagged.png");

    expect(tagged?.tags).toEqual(["npc"]);
    expect(untagged?.tags).toBeUndefined();
  });

  it("marks a file as pending when its local hash differs from the remote hash", async () => {
    const mock = createMock();

    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { path: "changed.png", hash: "local-hash", previous_hash: null },
        { path: "unchanged.png", hash: "same-hash", previous_hash: null },
      ]);
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([
      { path: "changed.png", hash: "remote-hash", size: 1 },
      { path: "unchanged.png", hash: "same-hash", size: 1 },
    ]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-sync-test-"));
    await fs.writeFile(path.join(tempDir, "changed.png"), "x");
    await fs.writeFile(path.join(tempDir, "unchanged.png"), "x");

    const entries = await listDirectory(tempDir, "");
    const changed = entries.find((entry) => entry.name === "changed.png");
    const unchanged = entries.find((entry) => entry.name === "unchanged.png");

    expect(changed?.syncStatus).toBe("pending");
    expect(unchanged?.syncStatus).toBeUndefined();
  });

  it("includes a synthetic entry for a file that was deleted locally but still exists remotely", async () => {
    const mock = createMock();

    mock.selectFrom("assets").execute.mockResolvedValueOnce([]);
    mock
      .selectFrom("remote_assets")
      .execute.mockResolvedValueOnce([{ path: "gone.png", hash: "remote-hash", size: 42 }]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-deleted-test-"));

    const entries = await listDirectory(tempDir, "");

    expect(entries).toEqual([{ name: "gone.png", type: "file", size: 42, syncStatus: "deleted" }]);
  });

  it("marks a file as new when it has no remote counterpart", async () => {
    const mock = createMock();

    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ path: "brand-new.png", hash: "local-hash", previous_hash: null }]);
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-new-test-"));
    await fs.writeFile(path.join(tempDir, "brand-new.png"), "x");

    const entries = await listDirectory(tempDir, "");
    const brandNew = entries.find((entry) => entry.name === "brand-new.png");

    expect(brandNew?.syncStatus).toBe("new");
  });

  it("treats a renamed file as renamed rather than new, and hides its old remote path", async () => {
    const mock = createMock();

    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ path: "renamed.png", hash: "shared-hash", previous_hash: null }]);
    mock
      .selectFrom("remote_assets")
      .execute.mockResolvedValueOnce([{ path: "old-name.png", hash: "shared-hash", size: 1 }]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-rename-test-"));
    await fs.writeFile(path.join(tempDir, "renamed.png"), "x");

    const entries = await listDirectory(tempDir, "");
    const renamed = entries.find((entry) => entry.name === "renamed.png");
    const oldEntry = entries.find((entry) => entry.name === "old-name.png");

    expect(renamed?.syncStatus).toBe("renamed");
    expect(oldEntry).toBeUndefined();
  });

  it("marks a directory as having pending sync when a nested descendant changed", async () => {
    const mock = createMock();

    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([
        { path: "tiles/forests/leaf.png", hash: "local-hash", previous_hash: null },
      ]);
    mock
      .selectFrom("remote_assets")
      .execute.mockResolvedValueOnce([
        { path: "tiles/forests/leaf.png", hash: "remote-hash", size: 1 },
      ]);
    mock.selectFrom("directories").execute.mockResolvedValueOnce([]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-nested-sync-test-"));
    await fs.mkdir(path.join(tempDir, "tiles", "forests"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tiles", "forests", "leaf.png"), "x");

    const entries = await listDirectory(tempDir, "");
    const tiles = entries.find((entry) => entry.name === "tiles");

    expect(tiles?.hasPendingSync).toBe(true);
  });

  it("reuses the cached remote index across repeated calls, so a direct db write bypassing invalidation is not reflected", async () => {
    const mock = createMock();

    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ path: "forest.png", hash: "same-hash", previous_hash: null }])
      .mockResolvedValueOnce([]);
    mock
      .selectFrom("remote_assets")
      .execute.mockResolvedValueOnce([{ path: "forest.png", hash: "same-hash", size: 14 }]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "list-directory-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    const first = await listDirectory(tempDir, "");
    expect(first.find((entry) => entry.name === "forest.png")?.syncStatus).toBeUndefined();

    await mock
      .updateTable("remote_assets")
      .set({ hash: "different-hash" })
      .where("path", "=", "forest.png")
      .execute();
    const second = await listDirectory(tempDir, "");

    expect(second.find((entry) => entry.name === "forest.png")?.syncStatus).toBeUndefined();
  });
});
