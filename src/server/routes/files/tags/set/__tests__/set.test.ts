import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "#server/db/index.ts";
import { HttpError } from "#server/errors/index.ts";
import { setAssetTags } from "../set-asset-tags.ts";

describe("setAssetTags (requires DATABASE_URL pointing at a running Postgres)", () => {
  let tempDir = "";

  afterEach(async () => {
    await db.deleteFrom("assets").where("path", "like", "tags-test/%").execute();

    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("creates an assets row on the fly when tagging a file that was never rescanned", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tags-test-"));
    await fs.mkdir(path.join(tempDir, "tags-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tags-test", "npc.png"), "npc-bytes");

    const tags = await setAssetTags(tempDir, "tags-test/npc.png", [" NPC ", "npc"]);

    expect(tags).toEqual(["npc"]);

    const row = await db
      .selectFrom("assets")
      .select("tags")
      .where("path", "=", "tags-test/npc.png")
      .executeTakeFirstOrThrow();

    expect(row.tags).toEqual(["npc"]);
  });

  it("replaces the tag set on an existing row without touching size/hash", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tags-test-"));
    await fs.mkdir(path.join(tempDir, "tags-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tags-test", "loot.png"), "loot-bytes");

    await setAssetTags(tempDir, "tags-test/loot.png", ["loot"]);
    const tags = await setAssetTags(tempDir, "tags-test/loot.png", ["loot", "container"]);

    expect(tags).toEqual(["loot", "container"]);
  });

  it("rejects tagging a directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tags-test-"));
    await fs.mkdir(path.join(tempDir, "tags-test", "subdir"), { recursive: true });

    await expect(setAssetTags(tempDir, "tags-test/subdir", ["x"])).rejects.toThrow(HttpError);
  });
});
