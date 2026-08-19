import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { getLocalHashIndex } from "#server/asset-index-cache/index.ts";
import { db } from "#server/db/index.ts";
import { HttpError } from "#server/errors/index.ts";
import {
  cleanupAssetsByPrefix,
  destroyDbAfterAll,
  useTempDir,
} from "#server/test-utils/integration-lifecycle.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { moveEntry } from "../index.ts";

const PREFIX = "move-entry-test/";

describe("moveEntry (requires DATABASE_URL pointing at a running Postgres)", () => {
  const tempDir = useTempDir("move-entry-");

  cleanupAssetsByPrefix(PREFIX, ["assets", "directories"]);
  destroyDbAfterAll();

  beforeEach(async () => {
    await fs.mkdir(path.join(tempDir.path, "move-entry-test"), { recursive: true });
  });

  it("renames a file within the same directory", async () => {
    await fs.writeFile(path.join(tempDir.path, "move-entry-test", "forest.png"), "fake-png-bytes");

    await moveEntry(db, tempDir.path, `${PREFIX}forest.png`, `${PREFIX}forest-renamed.png`);

    await expect(
      fs.stat(path.join(tempDir.path, "move-entry-test", "forest.png")),
    ).rejects.toThrow();
    expect(
      (await fs.stat(path.join(tempDir.path, "move-entry-test", "forest-renamed.png"))).isFile(),
    ).toBe(true);
  });

  it("moves a file into a new directory, creating it as needed", async () => {
    await fs.writeFile(path.join(tempDir.path, "move-entry-test", "forest.png"), "fake-png-bytes");

    await moveEntry(db, tempDir.path, `${PREFIX}forest.png`, `${PREFIX}tiles/forest.png`);

    expect(
      (await fs.stat(path.join(tempDir.path, "move-entry-test", "tiles", "forest.png"))).isFile(),
    ).toBe(true);
  });

  it("rejects when the destination already exists", async () => {
    await fs.writeFile(path.join(tempDir.path, "move-entry-test", "a.png"), "a");
    await fs.writeFile(path.join(tempDir.path, "move-entry-test", "b.png"), "b");

    await expect(moveEntry(db, tempDir.path, `${PREFIX}a.png`, `${PREFIX}b.png`)).rejects.toThrow(
      HttpError,
    );
  });

  it("rejects a path that escapes the tree root", async () => {
    await fs.writeFile(path.join(tempDir.path, "move-entry-test", "a.png"), "a");

    await expect(moveEntry(db, tempDir.path, `${PREFIX}a.png`, "../escaped.png")).rejects.toThrow(
      UnsafePathError,
    );
  });

  it("carries the assets row over to the new path, preserving its id and hash", async () => {
    await fs.writeFile(path.join(tempDir.path, "move-entry-test", "forest.png"), "fake-png-bytes");
    const inserted = await db
      .insertInto("assets")
      .values({ path: `${PREFIX}forest.png`, size: 14, mtime: new Date(), hash: "known-hash" })
      .returning("id")
      .executeTakeFirstOrThrow();

    await moveEntry(db, tempDir.path, `${PREFIX}forest.png`, `${PREFIX}forest-renamed.png`);

    const movedRow = await db
      .selectFrom("assets")
      .select(["id", "hash"])
      .where("path", "=", `${PREFIX}forest-renamed.png`)
      .executeTakeFirstOrThrow();

    expect(movedRow.id).toEqual(inserted.id);
    expect(movedRow.hash).toEqual("known-hash");

    const oldRow = await db
      .selectFrom("assets")
      .select("id")
      .where("path", "=", `${PREFIX}forest.png`)
      .executeTakeFirst();

    expect(oldRow).toBeUndefined();
  });

  it("rewrites the path prefix for every asset nested under a moved directory", async () => {
    await fs.mkdir(path.join(tempDir.path, "move-entry-test", "tiles", "forest"), {
      recursive: true,
    });
    await fs.writeFile(path.join(tempDir.path, "move-entry-test", "tiles", "a.png"), "a");
    await fs.writeFile(path.join(tempDir.path, "move-entry-test", "tiles", "forest", "b.png"), "b");
    await db
      .insertInto("assets")
      .values([
        { path: `${PREFIX}tiles/a.png`, size: 1, mtime: new Date(), hash: "hash-a" },
        { path: `${PREFIX}tiles/forest/b.png`, size: 1, mtime: new Date(), hash: "hash-b" },
      ])
      .execute();

    await moveEntry(db, tempDir.path, `${PREFIX}tiles`, `${PREFIX}sprites`);

    const remainingPaths = await db
      .selectFrom("assets")
      .select("path")
      .where("path", "like", `${PREFIX}%`)
      .orderBy("path")
      .execute();

    expect(remainingPaths.map((row) => row.path)).toEqual([
      `${PREFIX}sprites/a.png`,
      `${PREFIX}sprites/forest/b.png`,
    ]);
  });

  it("subtracts a moved file's contribution from the old parent and adds it to the new parent", async () => {
    const FOREST_PNG_SIZE = 14;

    await fs.mkdir(path.join(tempDir.path, "move-entry-test", "oldloc"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir.path, "move-entry-test", "oldloc", "forest.png"),
      "fake-png-bytes",
    );
    await db
      .insertInto("assets")
      .values({
        path: `${PREFIX}oldloc/forest.png`,
        size: FOREST_PNG_SIZE,
        mtime: new Date(),
        hash: "known-hash",
      })
      .execute();
    await db
      .insertInto("directories")
      .values({
        path: `${PREFIX}oldloc`,
        parent_id: null,
        total_size: FOREST_PNG_SIZE,
        file_count: 1,
        folder_count: 0,
      })
      .execute();

    // Moving between two sibling branches (both directly under "move-entry-test")
    // keeps the shared ancestor's net change at zero, so the old/new parent
    // checks below stay isolated to the branch that actually changed.
    await moveEntry(db, tempDir.path, `${PREFIX}oldloc/forest.png`, `${PREFIX}newloc/forest.png`);

    const oldParent = await db
      .selectFrom("directories")
      .select(["total_size", "file_count"])
      .where("path", "=", `${PREFIX}oldloc`)
      .executeTakeFirstOrThrow();
    const newParent = await db
      .selectFrom("directories")
      .select(["total_size", "file_count"])
      .where("path", "=", `${PREFIX}newloc`)
      .executeTakeFirstOrThrow();

    expect(Number(oldParent.total_size)).toBe(0);
    expect(oldParent.file_count).toBe(0);
    expect(Number(newParent.total_size)).toBe(FOREST_PNG_SIZE);
    expect(newParent.file_count).toBe(1);
  });

  it("rewrites the moved directory's own row and carries its aggregate to the new parent", async () => {
    await fs.mkdir(path.join(tempDir.path, "move-entry-test", "from", "tiles", "forest"), {
      recursive: true,
    });
    await fs.mkdir(path.join(tempDir.path, "move-entry-test", "to"), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, "move-entry-test", "from", "tiles", "a.png"), "a");
    await fs.writeFile(
      path.join(tempDir.path, "move-entry-test", "from", "tiles", "forest", "b.png"),
      "b",
    );
    await db
      .insertInto("assets")
      .values([
        { path: `${PREFIX}from/tiles/a.png`, size: 1, mtime: new Date(), hash: "hash-a" },
        { path: `${PREFIX}from/tiles/forest/b.png`, size: 1, mtime: new Date(), hash: "hash-b" },
      ])
      .execute();
    await db
      .insertInto("directories")
      .values([
        {
          path: `${PREFIX}from`,
          parent_id: null,
          total_size: 2,
          file_count: 2,
          folder_count: 2,
        },
        {
          path: `${PREFIX}from/tiles`,
          parent_id: null,
          total_size: 2,
          file_count: 2,
          folder_count: 1,
        },
        {
          path: `${PREFIX}from/tiles/forest`,
          parent_id: null,
          total_size: 1,
          file_count: 1,
          folder_count: 0,
        },
        {
          path: `${PREFIX}to`,
          parent_id: null,
          total_size: 0,
          file_count: 0,
          folder_count: 0,
        },
      ])
      .execute();

    // "from" and "to" are disjoint siblings under "move-entry-test", so this
    // move transfers the subtree's aggregate between two unrelated branches.
    await moveEntry(db, tempDir.path, `${PREFIX}from/tiles`, `${PREFIX}to/sprites`);

    const remainingUnderFrom = await db
      .selectFrom("directories")
      .select("path")
      .where("path", "like", `${PREFIX}from/%`)
      .execute();

    expect(remainingUnderFrom).toEqual([]);

    const movedDirectory = await db
      .selectFrom("directories")
      .select(["total_size", "file_count", "folder_count"])
      .where("path", "=", `${PREFIX}to/sprites`)
      .executeTakeFirstOrThrow();

    expect(Number(movedDirectory.total_size)).toBe(2);
    expect(movedDirectory.file_count).toBe(2);
    expect(movedDirectory.folder_count).toBe(1);

    const oldParent = await db
      .selectFrom("directories")
      .select(["total_size", "file_count", "folder_count"])
      .where("path", "=", `${PREFIX}from`)
      .executeTakeFirstOrThrow();

    expect(Number(oldParent.total_size)).toBe(0);
    expect(oldParent.file_count).toBe(0);
    expect(oldParent.folder_count).toBe(0);

    const newParent = await db
      .selectFrom("directories")
      .select(["total_size", "file_count", "folder_count"])
      .where("path", "=", `${PREFIX}to`)
      .executeTakeFirstOrThrow();

    expect(Number(newParent.total_size)).toBe(2);
    expect(newParent.file_count).toBe(2);
    expect(newParent.folder_count).toBe(2);
  });

  it("invalidates the cached local hash index so a renamed path is reflected immediately", async () => {
    await fs.writeFile(path.join(tempDir.path, "move-entry-test", "forest.png"), "fake-png-bytes");
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}forest.png`, size: 14, mtime: new Date(), hash: "known-hash" })
      .execute();

    await getLocalHashIndex(db);
    await moveEntry(db, tempDir.path, `${PREFIX}forest.png`, `${PREFIX}forest-renamed.png`);
    const index = await getLocalHashIndex(db);

    expect(index.has(`${PREFIX}forest.png`)).toBe(false);
    expect(index.has(`${PREFIX}forest-renamed.png`)).toBe(true);
  });
});
