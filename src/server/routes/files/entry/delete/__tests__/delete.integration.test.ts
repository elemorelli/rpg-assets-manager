import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";
import { HttpError } from "#server/errors/index.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { deleteEntry } from "../delete-entry.ts";

const PREFIX = "delete-entry-test/";

describe("deleteEntry (requires DATABASE_URL pointing at a running Postgres)", () => {
  let tempDir = "";

  afterEach(async () => {
    await db.deleteFrom("assets").where("path", "like", `${PREFIX}%`).execute();

    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("deletes a file", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));
    await fs.mkdir(path.join(tempDir, "delete-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "forest.png"), "fake-png-bytes");

    await deleteEntry(db, tempDir, `${PREFIX}forest.png`);

    await expect(fs.stat(path.join(tempDir, "delete-entry-test", "forest.png"))).rejects.toThrow();
  });

  it("deletes a directory and its contents", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));
    await fs.mkdir(path.join(tempDir, "delete-entry-test", "tiles"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "delete-entry-test", "tiles", "forest.png"),
      "fake-png-bytes",
    );

    await deleteEntry(db, tempDir, `${PREFIX}tiles`);

    await expect(fs.stat(path.join(tempDir, "delete-entry-test", "tiles"))).rejects.toThrow();
  });

  it("rejects deleting the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));

    await expect(deleteEntry(db, tempDir, "")).rejects.toThrow(HttpError);
  });

  it("rejects a path that escapes the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));

    await expect(deleteEntry(db, tempDir, "../escaped")).rejects.toThrow(UnsafePathError);
  });

  it("removes the assets row for a deleted file", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));
    await fs.mkdir(path.join(tempDir, "delete-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "forest.png"), "fake-png-bytes");
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}forest.png`, size: 14, mtime: new Date(), hash: "known-hash" })
      .execute();

    await deleteEntry(db, tempDir, `${PREFIX}forest.png`);

    const row = await db
      .selectFrom("assets")
      .select("id")
      .where("path", "=", `${PREFIX}forest.png`)
      .executeTakeFirst();

    expect(row).toBeUndefined();
  });

  it("removes the assets rows for every file nested under a deleted directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-entry-"));
    await fs.mkdir(path.join(tempDir, "delete-entry-test", "tiles", "forest"), {
      recursive: true,
    });
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "tiles", "a.png"), "a");
    await fs.writeFile(path.join(tempDir, "delete-entry-test", "tiles", "forest", "b.png"), "b");
    await db
      .insertInto("assets")
      .values([
        { path: `${PREFIX}tiles/a.png`, size: 1, mtime: new Date(), hash: "hash-a" },
        { path: `${PREFIX}tiles/forest/b.png`, size: 1, mtime: new Date(), hash: "hash-b" },
      ])
      .execute();

    await deleteEntry(db, tempDir, `${PREFIX}tiles`);

    const remainingRows = await db
      .selectFrom("assets")
      .select("path")
      .where("path", "like", `${PREFIX}%`)
      .execute();

    expect(remainingRows).toEqual([]);
  });
});
