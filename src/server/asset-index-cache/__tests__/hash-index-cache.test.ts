import type { Kysely } from "kysely";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const {
  getLocalHashIndex,
  getRemoteHashIndex,
  invalidateLocalHashIndex,
  invalidateRemoteHashIndex,
} = await import("../hash-index-cache.ts");

describe("hash index cache", () => {
  let mock: MockDb;

  beforeEach(() => {
    const mockDb = createMockDb();

    currentMockDb = mockDb;
    mock = mockDb as unknown as MockDb;
  });

  it("returns the cached local index on a second call without re-reading the db", async () => {
    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([{ path: "a.png", hash: "hash-a", previous_hash: null }]);

    const first = await getLocalHashIndex();
    const second = await getLocalHashIndex();

    expect([...first.keys()]).toEqual(["a.png"]);
    expect([...second.keys()]).toEqual(["a.png"]);
    expect(mock.selectFrom("assets").execute).toHaveBeenCalledTimes(1);
  });

  it("reflects a write immediately after invalidateLocalHashIndex", async () => {
    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([{ path: "a.png", hash: "hash-a", previous_hash: null }])
      .mockResolvedValueOnce([
        { path: "a.png", hash: "hash-a", previous_hash: null },
        { path: "b.png", hash: "hash-b", previous_hash: null },
      ]);

    await getLocalHashIndex();
    invalidateLocalHashIndex();
    const index = await getLocalHashIndex();

    expect([...index.keys()].sort()).toEqual(["a.png", "b.png"]);
    expect(mock.selectFrom("assets").execute).toHaveBeenCalledTimes(2);
  });

  it("caches and invalidates the remote index independently of the local index", async () => {
    mock
      .selectFrom("remote_assets")
      .execute.mockResolvedValueOnce([{ path: "a.png", hash: "hash-a", size: 1 }])
      .mockResolvedValueOnce([
        { path: "a.png", hash: "hash-a", size: 1 },
        { path: "b.png", hash: "hash-b", size: 1 },
      ]);

    await getRemoteHashIndex();
    invalidateRemoteHashIndex();
    const index = await getRemoteHashIndex();

    expect([...index.keys()].sort()).toEqual(["a.png", "b.png"]);
    expect(mock.selectFrom("remote_assets").execute).toHaveBeenCalledTimes(2);
    expect(mock.selectFrom("assets").execute).not.toHaveBeenCalled();
  });

  it("invalidating a db with no cached entry yet is a safe no-op", () => {
    expect(() => invalidateLocalHashIndex()).not.toThrow();
    expect(() => invalidateRemoteHashIndex()).not.toThrow();
  });
});
