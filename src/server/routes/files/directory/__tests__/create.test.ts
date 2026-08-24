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

const { createDirectory } = await import("../create.ts");

const THIRD_CALL = 3;

const createMock = (): MockDb => {
  const mockDb = createMockDb();

  currentMockDb = mockDb;

  const mock = mockDb as unknown as MockDb;
  let nextDirectoryId = 1;

  mock.insertInto("directories").executeTakeFirstOrThrow.mockImplementation(() => ({
    id: String(nextDirectoryId++),
  }));

  return mock;
};

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
    createMock();

    await createDirectory(tempDir, "tiles");

    const stat = await fs.stat(path.join(tempDir, "tiles"));

    expect(stat.isDirectory()).toBe(true);
  });

  it("rejects a path that escapes the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));
    createMock();

    await expect(createDirectory(tempDir, "../escaped")).rejects.toThrow(UnsafePathError);
  });

  it("throws when the directory already exists", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));
    await fs.mkdir(path.join(tempDir, "tiles"));
    createMock();

    await expect(createDirectory(tempDir, "tiles")).rejects.toThrow();
  });

  it("creates a directory row for the new directory itself", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));
    const mock = createMock();

    await createDirectory(tempDir, "tiles");

    expect(mock.insertInto("directories").values).toHaveBeenNthCalledWith(2, {
      path: "tiles",
      parent_id: 1,
      total_size: 0,
      file_count: 0,
      folder_count: 0,
    });
  });

  it("increments folder_count on the parent and its ancestors, not on itself", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-directory-"));
    const mock = createMock();

    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "1", total_size: 0, file_count: 0, folder_count: 0 })
      .mockResolvedValueOnce({ id: "1", total_size: 0, file_count: 0, folder_count: 0 })
      .mockResolvedValueOnce({ id: "2", total_size: 0, file_count: 0, folder_count: 0 })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "2", total_size: 0, file_count: 0, folder_count: 0 })
      .mockResolvedValueOnce({ id: "1", total_size: 0, file_count: 0, folder_count: 1 });

    await createDirectory(tempDir, "tiles");
    await createDirectory(tempDir, "tiles/forest");

    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(1, {
      total_size: 0,
      file_count: 0,
      folder_count: 1,
    });
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(2, {
      total_size: 0,
      file_count: 0,
      folder_count: 1,
    });
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(THIRD_CALL, {
      total_size: 0,
      file_count: 0,
      folder_count: 2,
    });
  });
});
