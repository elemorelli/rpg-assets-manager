import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getLocalHashIndex } from "#server/asset-index-cache/index.ts";
import { HttpError } from "#server/errors/index.ts";
import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { setAssetTags } from "../set-asset-tags.ts";

describe("setAssetTags", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("creates an assets row on the fly when tagging a file that was never rescanned", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tags-test-"));
    await fs.mkdir(path.join(tempDir, "tags-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tags-test", "npc.png"), "npc-bytes");

    const tags = await setAssetTags(db, tempDir, "tags-test/npc.png", [" NPC ", "npc"]);

    expect(tags).toEqual(["npc"]);
    expect(db.rows("assets")).toMatchObject([{ path: "tags-test/npc.png", tags: ["npc"] }]);
  });

  it("replaces the tag set on an existing row without touching size/hash", async () => {
    const db = createFakeDb();

    db.seed("assets", [
      { id: "1", path: "tags-test/loot.png", size: 5, hash: "loot-hash", tags: ["loot"] },
    ]);

    const tags = await setAssetTags(db, "/unused", "tags-test/loot.png", ["loot", "container"]);

    expect(tags).toEqual(["loot", "container"]);
    expect(db.rows("assets")).toMatchObject([
      { path: "tags-test/loot.png", size: 5, hash: "loot-hash", tags: ["loot", "container"] },
    ]);
  });

  it("rejects tagging a directory", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tags-test-"));
    await fs.mkdir(path.join(tempDir, "tags-test", "subdir"), { recursive: true });

    await expect(setAssetTags(db, tempDir, "tags-test/subdir", ["x"])).rejects.toThrow(HttpError);
  });

  it("rejects tagging the asset tree root itself", async () => {
    const db = createFakeDb();

    await expect(setAssetTags(db, "/unused", "", ["x"])).rejects.toThrow(HttpError);
  });

  it("invalidates the cached local hash index when tagging creates a new assets row", async () => {
    const db = createFakeDb();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tags-test-"));
    await fs.mkdir(path.join(tempDir, "tags-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tags-test", "npc.png"), "npc-bytes");

    await getLocalHashIndex(db);
    await setAssetTags(db, tempDir, "tags-test/npc.png", ["npc"]);
    const index = await getLocalHashIndex(db);

    expect(index.has("tags-test/npc.png")).toBe(true);
  });

  it("does not invalidate the cache when only replacing tags on an existing row", async () => {
    const db = createFakeDb();

    db.seed("assets", [
      { id: "1", path: "tags-test/loot.png", size: 5, hash: "loot-hash", tags: ["loot"] },
    ]);

    const index = await getLocalHashIndex(db);
    await setAssetTags(db, "/unused", "tags-test/loot.png", ["loot", "container"]);
    const cachedAgain = await getLocalHashIndex(db);

    expect(cachedAgain).toBe(index);
  });
});
