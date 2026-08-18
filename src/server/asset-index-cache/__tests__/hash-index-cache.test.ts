import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import {
  getLocalHashIndex,
  getRemoteHashIndex,
  invalidateLocalHashIndex,
  invalidateRemoteHashIndex,
} from "../hash-index-cache.ts";

describe("hash index cache", () => {
  it("caches the local index per db instance, not globally", async () => {
    const dbA = createFakeDb();
    const dbB = createFakeDb();

    await dbA
      .insertInto("assets")
      .values({ path: "a.png", size: 1, mtime: new Date(), hash: "hash-a" })
      .execute();
    await dbB
      .insertInto("assets")
      .values({ path: "b.png", size: 1, mtime: new Date(), hash: "hash-b" })
      .execute();

    const indexA = await getLocalHashIndex(dbA);
    const indexB = await getLocalHashIndex(dbB);

    expect([...indexA.keys()]).toEqual(["a.png"]);
    expect([...indexB.keys()]).toEqual(["b.png"]);
  });

  it("returns the cached local index on a second call without re-reading the db", async () => {
    const db = createFakeDb();

    await db
      .insertInto("assets")
      .values({ path: "a.png", size: 1, mtime: new Date(), hash: "hash-a" })
      .execute();

    await getLocalHashIndex(db);
    await db
      .insertInto("assets")
      .values({ path: "b.png", size: 1, mtime: new Date(), hash: "hash-b" })
      .execute();
    const index = await getLocalHashIndex(db);

    expect([...index.keys()]).toEqual(["a.png"]);
  });

  it("reflects a write immediately after invalidateLocalHashIndex", async () => {
    const db = createFakeDb();

    await db
      .insertInto("assets")
      .values({ path: "a.png", size: 1, mtime: new Date(), hash: "hash-a" })
      .execute();

    await getLocalHashIndex(db);
    await db
      .insertInto("assets")
      .values({ path: "b.png", size: 1, mtime: new Date(), hash: "hash-b" })
      .execute();
    invalidateLocalHashIndex(db);
    const index = await getLocalHashIndex(db);

    expect([...index.keys()].sort()).toEqual(["a.png", "b.png"]);
  });

  it("caches and invalidates the remote index independently of the local index", async () => {
    const db = createFakeDb();

    await db
      .insertInto("remote_assets")
      .values({ path: "a.png", size: 1, hash: "hash-a" })
      .execute();

    await getRemoteHashIndex(db);
    await db
      .insertInto("remote_assets")
      .values({ path: "b.png", size: 1, hash: "hash-b" })
      .execute();
    invalidateRemoteHashIndex(db);
    const index = await getRemoteHashIndex(db);

    expect([...index.keys()].sort()).toEqual(["a.png", "b.png"]);
  });

  it("invalidating a db with no cached entry yet is a safe no-op", () => {
    const db = createFakeDb();

    expect(() => invalidateLocalHashIndex(db)).not.toThrow();
    expect(() => invalidateRemoteHashIndex(db)).not.toThrow();
  });
});
