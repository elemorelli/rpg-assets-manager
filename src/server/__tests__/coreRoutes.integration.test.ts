import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.ts";
import { db } from "../db/index.ts";
import { HTTP_STATUS } from "../errors/index.ts";
import { getCurrentJob, subscribeToJobChanges } from "../jobs/jobStore.ts";

const PREFIX = "core-routes-test/";

describe("core routes (requires DATABASE_URL pointing at a running Postgres)", () => {
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

  it("bootstraps the asset tree via POST /api/bootstrap", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    await fs.mkdir(path.join(tempDir, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildApp({
      frontendDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });

    const response = await app.inject({ method: "POST", url: "/api/bootstrap" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual({ inserted: 1, skipped: 0 });

    const assetRows = await db
      .selectFrom("assets")
      .select("path")
      .where("path", "like", `${PREFIX}%`)
      .execute();

    expect(assetRows).toEqual([{ path: `${PREFIX}a.png` }]);
  });

  it("rescans the asset tree via POST /api/rescan, defaulting forceRehash to false", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    await fs.mkdir(path.join(tempDir, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildApp({
      frontendDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });

    const firstRun = await app.inject({ method: "POST", url: "/api/rescan" });

    expect(firstRun.statusCode).toBe(HTTP_STATUS.ok);
    expect(firstRun.json()).toEqual({ hashed: 1, unchanged: 0, removed: 0 });

    const secondRun = await app.inject({ method: "POST", url: "/api/rescan" });

    expect(secondRun.json()).toEqual({ hashed: 0, unchanged: 1, removed: 0 });
  });

  it("re-hashes every file via POST /api/rescan when forceRehash is true", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    await fs.mkdir(path.join(tempDir, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildApp({
      frontendDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });

    await app.inject({ method: "POST", url: "/api/rescan" });

    const forced = await app.inject({
      method: "POST",
      url: "/api/rescan",
      payload: { forceRehash: true },
    });

    expect(forced.json()).toEqual({ hashed: 1, unchanged: 0, removed: 0 });
  });

  it("publishes rescan progress to the job store and clears it on completion via POST /api/rescan", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    await fs.mkdir(path.join(tempDir, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildApp({
      frontendDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });
    const observedJobs: unknown[] = [];
    const unsubscribe = subscribeToJobChanges((job) => observedJobs.push(job));

    const response = await app.inject({ method: "POST", url: "/api/rescan" });

    unsubscribe();
    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(observedJobs[0]).toMatchObject({ type: "rescan", done: 0 });
    expect(getCurrentJob()).toBeNull();
  });

  it("reports the batch diff via GET /api/diff", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    const app = buildApp({
      frontendDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });

    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}added.png`, size: 1, mtime: new Date(), hash: "hash-added" })
      .execute();

    const response = await app.inject({ method: "GET", url: "/api/diff" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    const body = response.json();

    expect(body.added).toContain(`${PREFIX}added.png`);
  });
});
