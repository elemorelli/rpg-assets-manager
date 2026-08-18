import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";
import { HttpError } from "#server/errors/index.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { moveEntry } from "../index.ts";

const PREFIX = "move-entry-test/";

describe("moveEntry (requires DATABASE_URL pointing at a running Postgres)", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "move-entry-"));
    await fs.mkdir(path.join(tempDir, "move-entry-test"), { recursive: true });
  });

  afterEach(async () => {
    await db.deleteFrom("assets").where("path", "like", `${PREFIX}%`).execute();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("renames a file within the same directory", async () => {
    await fs.writeFile(path.join(tempDir, "move-entry-test", "forest.png"), "fake-png-bytes");

    await moveEntry(db, tempDir, `${PREFIX}forest.png`, `${PREFIX}forest-renamed.png`);

    await expect(fs.stat(path.join(tempDir, "move-entry-test", "forest.png"))).rejects.toThrow();
    expect(
      (await fs.stat(path.join(tempDir, "move-entry-test", "forest-renamed.png"))).isFile(),
    ).toBe(true);
  });

  it("moves a file into a new directory, creating it as needed", async () => {
    await fs.writeFile(path.join(tempDir, "move-entry-test", "forest.png"), "fake-png-bytes");

    await moveEntry(db, tempDir, `${PREFIX}forest.png`, `${PREFIX}tiles/forest.png`);

    expect(
      (await fs.stat(path.join(tempDir, "move-entry-test", "tiles", "forest.png"))).isFile(),
    ).toBe(true);
  });

  it("rejects when the destination already exists", async () => {
    await fs.writeFile(path.join(tempDir, "move-entry-test", "a.png"), "a");
    await fs.writeFile(path.join(tempDir, "move-entry-test", "b.png"), "b");

    await expect(moveEntry(db, tempDir, `${PREFIX}a.png`, `${PREFIX}b.png`)).rejects.toThrow(
      HttpError,
    );
  });

  it("rejects a path that escapes the tree root", async () => {
    await fs.writeFile(path.join(tempDir, "move-entry-test", "a.png"), "a");

    await expect(moveEntry(db, tempDir, `${PREFIX}a.png`, "../escaped.png")).rejects.toThrow(
      UnsafePathError,
    );
  });

  it("carries the assets row over to the new path, preserving its id and hash", async () => {
    await fs.writeFile(path.join(tempDir, "move-entry-test", "forest.png"), "fake-png-bytes");
    const inserted = await db
      .insertInto("assets")
      .values({ path: `${PREFIX}forest.png`, size: 14, mtime: new Date(), hash: "known-hash" })
      .returning("id")
      .executeTakeFirstOrThrow();

    await moveEntry(db, tempDir, `${PREFIX}forest.png`, `${PREFIX}forest-renamed.png`);

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
    await fs.mkdir(path.join(tempDir, "move-entry-test", "tiles", "forest"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "move-entry-test", "tiles", "a.png"), "a");
    await fs.writeFile(path.join(tempDir, "move-entry-test", "tiles", "forest", "b.png"), "b");
    await db
      .insertInto("assets")
      .values([
        { path: `${PREFIX}tiles/a.png`, size: 1, mtime: new Date(), hash: "hash-a" },
        { path: `${PREFIX}tiles/forest/b.png`, size: 1, mtime: new Date(), hash: "hash-b" },
      ])
      .execute();

    await moveEntry(db, tempDir, `${PREFIX}tiles`, `${PREFIX}sprites`);

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
});
