import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLocalHashIndex } from "#server/asset-index-cache/index.ts";
import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { rescanAssets } from "../rescan.ts";

const PREFIX = "rescan-test/";

describe("rescanAssets", () => {
  let tempDir = "";
  let db: ReturnType<typeof createFakeDb>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rescan-test-"));
    await fs.mkdir(path.join(tempDir, "rescan-test"), { recursive: true });
    db = createFakeDb();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("hashes new files, leaves unchanged files alone, and removes deleted ones", async () => {
    await fs.writeFile(path.join(tempDir, "rescan-test", "stays.png"), "stays");
    await fs.writeFile(path.join(tempDir, "rescan-test", "removed.png"), "removed");

    const firstRun = await rescanAssets(db, tempDir);

    expect(firstRun).toEqual({ hashed: 2, unchanged: 0, removed: 0, renamed: 0 });

    await fs.rm(path.join(tempDir, "rescan-test", "removed.png"));
    await fs.writeFile(path.join(tempDir, "rescan-test", "added.png"), "added");

    const secondRun = await rescanAssets(db, tempDir);

    expect(secondRun).toEqual({ hashed: 1, unchanged: 1, removed: 1, renamed: 0 });

    const remainingPaths = await db
      .selectFrom("assets")
      .select("path")
      .orderBy("path", "asc")
      .execute();

    expect(remainingPaths.map((row) => row.path)).toEqual([
      `${PREFIX}added.png`,
      `${PREFIX}stays.png`,
    ]);
  });

  it("re-hashes every file when forceRehash is set", async () => {
    await fs.writeFile(path.join(tempDir, "rescan-test", "stays.png"), "stays");

    await rescanAssets(db, tempDir);

    const forced = await rescanAssets(db, tempDir, { forceRehash: true });

    expect(forced).toEqual({ hashed: 1, unchanged: 0, removed: 0, renamed: 0 });
  });

  it("keeps the same id and reports a rename when a file is renamed", async () => {
    await fs.writeFile(path.join(tempDir, "rescan-test", "before.png"), "same-content");

    await rescanAssets(db, tempDir);

    const beforeRow = await db
      .selectFrom("assets")
      .select("id")
      .where("path", "=", `${PREFIX}before.png`)
      .executeTakeFirstOrThrow();

    await fs.rename(
      path.join(tempDir, "rescan-test", "before.png"),
      path.join(tempDir, "rescan-test", "after.png"),
    );

    const summary = await rescanAssets(db, tempDir);

    expect(summary).toEqual({ hashed: 1, unchanged: 0, removed: 0, renamed: 1 });

    const afterRow = await db
      .selectFrom("assets")
      .select("id")
      .where("path", "=", `${PREFIX}after.png`)
      .executeTakeFirstOrThrow();

    expect(afterRow.id).toEqual(beforeRow.id);

    const oldRow = await db
      .selectFrom("assets")
      .select("id")
      .where("path", "=", `${PREFIX}before.png`)
      .executeTakeFirst();

    expect(oldRow).toBeUndefined();
  });

  it("recomputes directory aggregates to reflect the post-rescan state", async () => {
    await fs.writeFile(path.join(tempDir, "rescan-test", "stays.png"), "stays");
    await fs.writeFile(path.join(tempDir, "rescan-test", "removed.png"), "removed");
    await rescanAssets(db, tempDir);

    await fs.rm(path.join(tempDir, "rescan-test", "removed.png"));
    await rescanAssets(db, tempDir);

    const root = await db
      .selectFrom("directories")
      .select(["total_size", "file_count"])
      .where("path", "=", "rescan-test")
      .executeTakeFirstOrThrow();

    expect(root).toMatchObject({ total_size: Buffer.byteLength("stays"), file_count: 1 });
  });

  it("reports progress via the onProgress callback", async () => {
    await fs.writeFile(path.join(tempDir, "rescan-test", "one.png"), "one");
    await fs.writeFile(path.join(tempDir, "rescan-test", "two.png"), "two");

    const progressUpdates: { done: number; total: number; detail?: string }[] = [];

    await rescanAssets(db, tempDir, {}, (progress) => progressUpdates.push(progress));

    expect(progressUpdates[0]).toMatchObject({ done: 0, total: 2 });
    expect(progressUpdates[0]?.detail).toMatch(/\.png$/);
    expect(progressUpdates.at(-1)).toEqual({ done: 2, total: 2 });
  });

  it("invalidates the cached local hash index after a rescan removes a deleted file", async () => {
    await fs.writeFile(path.join(tempDir, "rescan-test", "stays.png"), "stays");
    await fs.writeFile(path.join(tempDir, "rescan-test", "removed.png"), "removed");
    await rescanAssets(db, tempDir);

    await getLocalHashIndex(db);
    await fs.rm(path.join(tempDir, "rescan-test", "removed.png"));
    await rescanAssets(db, tempDir);
    const index = await getLocalHashIndex(db);

    expect(index.has(`${PREFIX}removed.png`)).toBe(false);
    expect(index.has(`${PREFIX}stays.png`)).toBe(true);
  });
});
