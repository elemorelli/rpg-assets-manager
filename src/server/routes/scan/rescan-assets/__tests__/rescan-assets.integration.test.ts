import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";

import { rescanAssets } from "../rescan.ts";

const PREFIX = "rescan-test/";

describe("rescanAssets (requires DATABASE_URL pointing at a running Postgres)", () => {
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

  it("hashes new files, leaves unchanged files alone, and removes deleted ones", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rescan-test-"));
    await fs.mkdir(path.join(tempDir, "rescan-test"), { recursive: true });
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
      .where("path", "like", `${PREFIX}%`)
      .orderBy("path")
      .execute();

    expect(remainingPaths.map((row) => row.path)).toEqual([
      `${PREFIX}added.png`,
      `${PREFIX}stays.png`,
    ]);
  });

  it("re-hashes every file when forceRehash is set", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rescan-test-"));
    await fs.mkdir(path.join(tempDir, "rescan-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "rescan-test", "stays.png"), "stays");

    await rescanAssets(db, tempDir);

    const forced = await rescanAssets(db, tempDir, { forceRehash: true });

    expect(forced).toEqual({ hashed: 1, unchanged: 0, removed: 0, renamed: 0 });
  });

  it("keeps the same id and reports a rename when a file is renamed", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rescan-test-"));
    await fs.mkdir(path.join(tempDir, "rescan-test"), { recursive: true });
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

  it("reports progress via the onProgress callback", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rescan-test-"));
    await fs.mkdir(path.join(tempDir, "rescan-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "rescan-test", "one.png"), "one");
    await fs.writeFile(path.join(tempDir, "rescan-test", "two.png"), "two");

    const progressUpdates: { done: number; total: number }[] = [];

    await rescanAssets(db, tempDir, {}, (progress) => progressUpdates.push(progress));

    expect(progressUpdates[0]).toEqual({ done: 0, total: 2 });
    expect(progressUpdates.at(-1)).toEqual({ done: 2, total: 2 });
  });
});
