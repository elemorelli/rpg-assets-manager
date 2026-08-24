import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Kysely } from "kysely";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getLocalHashIndex } from "#server/asset-index-cache/index.ts";
import type { DB } from "#server/db/index.ts";
import { HttpError } from "#server/errors/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { setAssetTags } = await import("../set.ts");

const createMock = (): MockDb => {
  const mockDb = createMockDb();

  currentMockDb = mockDb;

  return mockDb as unknown as MockDb;
};

describe("setAssetTags", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("creates an assets row on the fly when tagging a file that was never rescanned", async () => {
    const mock = createMock();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tags-test-"));
    await fs.mkdir(path.join(tempDir, "tags-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tags-test", "npc.png"), "npc-bytes");

    const tags = await setAssetTags(tempDir, "tags-test/npc.png", [" NPC ", "npc"]);

    expect(tags).toEqual(["npc"]);
    const [values] = mock.insertInto("assets").values.mock.calls[0];
    expect(values.path).toBe("tags-test/npc.png");
    expect(values.tags).toEqual(["npc"]);
  });

  it("replaces the tag set on an existing row without touching size/hash", async () => {
    const mock = createMock();

    mock.selectFrom("assets").executeTakeFirst.mockResolvedValueOnce({ id: "1" });

    const tags = await setAssetTags("/unused", "tags-test/loot.png", ["loot", "container"]);

    expect(tags).toEqual(["loot", "container"]);
    expect(mock.updateTable("assets").set).toHaveBeenCalledWith({ tags: ["loot", "container"] });
  });

  it("rejects tagging a directory", async () => {
    createMock();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tags-test-"));
    await fs.mkdir(path.join(tempDir, "tags-test", "subdir"), { recursive: true });

    await expect(setAssetTags(tempDir, "tags-test/subdir", ["x"])).rejects.toThrow(HttpError);
  });

  it("rejects tagging the asset tree root itself", async () => {
    createMock();

    await expect(setAssetTags("/unused", "", ["x"])).rejects.toThrow(HttpError);
  });

  it("invalidates the cached local hash index when tagging creates a new assets row", async () => {
    const mock = createMock();

    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ path: "tags-test/npc.png", hash: "h", previous_hash: null }]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tags-test-"));
    await fs.mkdir(path.join(tempDir, "tags-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tags-test", "npc.png"), "npc-bytes");

    await getLocalHashIndex();
    await setAssetTags(tempDir, "tags-test/npc.png", ["npc"]);
    const index = await getLocalHashIndex();

    expect(index.has("tags-test/npc.png")).toBe(true);
    expect(mock.selectFrom("assets").execute).toHaveBeenCalledTimes(2);
  });

  it("does not invalidate the cache when only replacing tags on an existing row", async () => {
    const mock = createMock();

    mock.selectFrom("assets").executeTakeFirst.mockResolvedValueOnce({ id: "1" });
    mock.selectFrom("assets").execute.mockResolvedValueOnce([]);

    const index = await getLocalHashIndex();
    await setAssetTags("/unused", "tags-test/loot.png", ["loot", "container"]);
    const cachedAgain = await getLocalHashIndex();

    expect(cachedAgain).toBe(index);
    expect(mock.selectFrom("assets").execute).toHaveBeenCalledTimes(1);
  });
});
