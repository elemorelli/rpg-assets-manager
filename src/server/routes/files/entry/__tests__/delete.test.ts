import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Kysely } from "kysely";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getLocalHashIndex } from "#server/asset-index-cache/index.ts";
import type { DB } from "#server/db/index.ts";
import { HttpError } from "#server/errors/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

const PREFIX = "delete-entry-test/";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { deleteEntry } = await import("../delete.ts");

describe("deleteEntry", () => {
  let tempDir = "";
  let mockDb: Kysely<DB>;
  let mock: MockDb;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));
    mockDb = createMockDb();
    currentMockDb = mockDb;
    mock = mockDb as unknown as MockDb;
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("deletes a file", async () => {
    await fs.mkdir(path.join(tempDir, "delete-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "forest.png"), "fake-png-bytes");

    await deleteEntry(tempDir, `${PREFIX}forest.png`);

    await expect(fs.stat(path.join(tempDir, "delete-entry-test", "forest.png"))).rejects.toThrow();
  });

  it("deletes a directory and its contents", async () => {
    await fs.mkdir(path.join(tempDir, "delete-entry-test", "tiles"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "delete-entry-test", "tiles", "forest.png"),
      "fake-png-bytes",
    );

    await deleteEntry(tempDir, `${PREFIX}tiles`);

    await expect(fs.stat(path.join(tempDir, "delete-entry-test", "tiles"))).rejects.toThrow();
  });

  it("rejects deleting the tree root", async () => {
    await expect(deleteEntry(tempDir, "")).rejects.toThrow(HttpError);
  });

  it("rejects a path that escapes the tree root", async () => {
    await expect(deleteEntry(tempDir, "../escaped")).rejects.toThrow(UnsafePathError);
  });

  it("issues deletes against both the assets and directories tables", async () => {
    await fs.mkdir(path.join(tempDir, "delete-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "forest.png"), "fake-png-bytes");

    await deleteEntry(tempDir, `${PREFIX}forest.png`);

    expect(mock.deleteFrom).toHaveBeenCalledWith("assets");
    expect(mock.deleteFrom).toHaveBeenCalledWith("directories");
    expect(mock.deleteFrom("assets").execute).toHaveBeenCalledTimes(1);
    expect(mock.deleteFrom("directories").execute).toHaveBeenCalledTimes(1);
  });

  it("subtracts a deleted file's size from the parent directory's aggregate", async () => {
    mock.selectFrom("assets").executeTakeFirst.mockResolvedValueOnce({ size: 14 });
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce({
        id: "2",
        total_size: 14,
        file_count: 1,
        folder_count: 0,
      })
      .mockResolvedValueOnce({ id: "1", total_size: 14, file_count: 1, folder_count: 1 });

    await fs.mkdir(path.join(tempDir, "delete-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "forest.png"), "fake-png-bytes");

    await deleteEntry(tempDir, `${PREFIX}forest.png`);

    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(1, {
      total_size: 0,
      file_count: 0,
      folder_count: 0,
    });
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(2, {
      total_size: 0,
      file_count: 0,
      folder_count: 1,
    });
  });

  it("subtracts the deleted directory's own contribution from its parent chain", async () => {
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce({
        id: "3",
        total_size: 2,
        file_count: 2,
        folder_count: 1,
      })
      .mockResolvedValueOnce({ id: "2", total_size: 2, file_count: 2, folder_count: 2 })
      .mockResolvedValueOnce({ id: "1", total_size: 2, file_count: 2, folder_count: 3 });

    await fs.mkdir(path.join(tempDir, "delete-entry-test", "tiles", "forest"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "tiles", "a.png"), "a");
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "tiles", "forest", "b.png"), "b");

    await deleteEntry(tempDir, `${PREFIX}tiles`);

    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(1, {
      total_size: 0,
      file_count: 0,
      folder_count: 0,
    });
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(2, {
      total_size: 0,
      file_count: 0,
      folder_count: 1,
    });
  });

  it("invalidates the cached local hash index so a later read re-queries instead of returning a stale hit", async () => {
    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([
        { path: `${PREFIX}forest.png`, hash: "known-hash", previous_hash: null },
      ])
      .mockResolvedValueOnce([]);

    await fs.mkdir(path.join(tempDir, "delete-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "forest.png"), "fake-png-bytes");

    const before = await getLocalHashIndex();
    expect(before.has(`${PREFIX}forest.png`)).toBe(true);

    await deleteEntry(tempDir, `${PREFIX}forest.png`);

    const after = await getLocalHashIndex();

    expect(after.has(`${PREFIX}forest.png`)).toBe(false);
    expect(mock.selectFrom("assets").execute).toHaveBeenCalledTimes(2);
  });
});
