import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";

import { bootstrapAssets } from "../bootstrap.ts";

const PREFIX = "bootstrap-test/";

describe("bootstrapAssets (requires DATABASE_URL pointing at a running Postgres)", () => {
  let tempDir = "";

  afterEach(async () => {
    await db.deleteFrom("assets").where("path", "like", `${PREFIX}%`).execute();
    await db.deleteFrom("remote_assets").where("path", "like", `${PREFIX}%`).execute();

    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("writes a matching snapshot to assets and remote_assets", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bootstrap-test-"));
    await fs.mkdir(path.join(tempDir, "bootstrap-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "b.png"), "fake-bytes-b");

    const summary = await bootstrapAssets(db, tempDir);

    expect(summary).toEqual({ inserted: 2, skipped: 0 });

    const assetRows = await db
      .selectFrom("assets")
      .select(["path", "hash"])
      .where("path", "like", `${PREFIX}%`)
      .orderBy("path")
      .execute();
    const remoteRows = await db
      .selectFrom("remote_assets")
      .select(["path", "hash"])
      .where("path", "like", `${PREFIX}%`)
      .orderBy("path")
      .execute();

    expect(assetRows).toEqual(remoteRows);
    expect(assetRows.map((row) => row.path)).toEqual([`${PREFIX}a.png`, `${PREFIX}b.png`]);
  });

  it("skips paths already present, so a second run is resumable", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bootstrap-test-"));
    await fs.mkdir(path.join(tempDir, "bootstrap-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");

    await bootstrapAssets(db, tempDir);

    await fs.writeFile(path.join(tempDir, "bootstrap-test", "b.png"), "fake-bytes-b");

    const secondSummary = await bootstrapAssets(db, tempDir);

    expect(secondSummary).toEqual({ inserted: 1, skipped: 1 });
  });
});
