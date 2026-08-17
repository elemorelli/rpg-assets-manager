import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";
import { HttpError } from "#server/errors/index.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { renameEntry } from "../rename-entry.ts";

const PREFIX = "rename-entry-test/";

describe("renameEntry (requires DATABASE_URL pointing at a running Postgres)", () => {
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

  it("renames a file within its own directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));
    await fs.mkdir(path.join(tempDir, "rename-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "rename-entry-test", "forest.png"), "fake-png-bytes");

    await renameEntry(db, tempDir, `${PREFIX}forest.png`, "forest-renamed.png");

    await expect(fs.stat(path.join(tempDir, "rename-entry-test", "forest.png"))).rejects.toThrow();
    expect(
      (await fs.stat(path.join(tempDir, "rename-entry-test", "forest-renamed.png"))).isFile(),
    ).toBe(true);
  });

  it("renames an entry nested in a subdirectory, keeping it in that directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));
    await fs.mkdir(path.join(tempDir, "rename-entry-test", "tiles"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "rename-entry-test", "tiles", "forest.png"),
      "fake-png-bytes",
    );

    await renameEntry(db, tempDir, `${PREFIX}tiles/forest.png`, "forest-renamed.png");

    expect(
      (
        await fs.stat(path.join(tempDir, "rename-entry-test", "tiles", "forest-renamed.png"))
      ).isFile(),
    ).toBe(true);
  });

  it("rejects when the new name already exists in that directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));
    await fs.mkdir(path.join(tempDir, "rename-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "rename-entry-test", "a.png"), "a");
    await fs.writeFile(path.join(tempDir, "rename-entry-test", "b.png"), "b");

    await expect(renameEntry(db, tempDir, `${PREFIX}a.png`, "b.png")).rejects.toThrow(HttpError);
  });

  it("rejects a new name that tries to escape the current directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));
    await fs.mkdir(path.join(tempDir, "rename-entry-test", "tiles"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "rename-entry-test", "tiles", "forest.png"),
      "fake-png-bytes",
    );

    await expect(
      renameEntry(db, tempDir, `${PREFIX}tiles/forest.png`, "../../../escaped.png"),
    ).rejects.toThrow(UnsafePathError);
  });

  it("rejects an unsafe current path", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));

    await expect(renameEntry(db, tempDir, "../escaped.png", "renamed.png")).rejects.toThrow(
      UnsafePathError,
    );
  });

  it("carries the assets row over to the renamed path", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-entry-"));
    await fs.mkdir(path.join(tempDir, "rename-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "rename-entry-test", "forest.png"), "fake-png-bytes");
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}forest.png`, size: 14, mtime: new Date(), hash: "known-hash" })
      .execute();

    await renameEntry(db, tempDir, `${PREFIX}forest.png`, "forest-renamed.png");

    const movedRow = await db
      .selectFrom("assets")
      .select("hash")
      .where("path", "=", `${PREFIX}forest-renamed.png`)
      .executeTakeFirstOrThrow();

    expect(movedRow.hash).toEqual("known-hash");
  });
});
