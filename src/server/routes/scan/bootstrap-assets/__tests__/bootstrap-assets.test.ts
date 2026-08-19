import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLocalHashIndex, getRemoteHashIndex } from "#server/asset-index-cache/index.ts";
import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { bootstrapAssets } from "../bootstrap.ts";

const PREFIX = "bootstrap-test/";

describe("bootstrapAssets", () => {
  let tempDir = "";
  let db: ReturnType<typeof createFakeDb>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bootstrap-test-"));
    await fs.mkdir(path.join(tempDir, "bootstrap-test"), { recursive: true });
    db = createFakeDb();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("writes a matching snapshot to assets and remote_assets", async () => {
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "b.png"), "fake-bytes-b");

    const summary = await bootstrapAssets(db, tempDir);

    expect(summary).toEqual({ inserted: 2, skipped: 0 });

    const assetRows = await db
      .selectFrom("assets")
      .select(["path", "hash"])
      .orderBy("path", "asc")
      .execute();
    const remoteRows = await db
      .selectFrom("remote_assets")
      .select(["path", "hash"])
      .orderBy("path", "asc")
      .execute();

    expect(assetRows).toEqual(remoteRows);
    expect(assetRows.map((row) => row.path)).toEqual([`${PREFIX}a.png`, `${PREFIX}b.png`]);
  });

  it("skips paths already present, so a second run is resumable", async () => {
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");

    await bootstrapAssets(db, tempDir);

    await fs.writeFile(path.join(tempDir, "bootstrap-test", "b.png"), "fake-bytes-b");

    const secondSummary = await bootstrapAssets(db, tempDir);

    expect(secondSummary).toEqual({ inserted: 1, skipped: 1 });
  });

  it("computes directory aggregates for the scanned tree", async () => {
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "b.png"), "fake-bytes-b");

    await bootstrapAssets(db, tempDir);

    const root = await db
      .selectFrom("directories")
      .select(["total_size", "file_count"])
      .where("path", "=", "bootstrap-test")
      .executeTakeFirstOrThrow();

    expect(root).toMatchObject({
      total_size: Buffer.byteLength("fake-bytes-a") + Buffer.byteLength("fake-bytes-b"),
      file_count: 2,
    });
  });

  it("invalidates both cached hash indexes after writing the snapshot", async () => {
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");

    await getLocalHashIndex(db);
    await getRemoteHashIndex(db);
    await bootstrapAssets(db, tempDir);
    const localIndex = await getLocalHashIndex(db);
    const remoteIndex = await getRemoteHashIndex(db);

    expect(localIndex.has(`${PREFIX}a.png`)).toBe(true);
    expect(remoteIndex.has(`${PREFIX}a.png`)).toBe(true);
  });
});
