import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.ts";
import { db } from "../../db/index.ts";
import { HTTP_STATUS } from "../../errors/index.ts";
import { loginTestSession } from "../../test-utils/login-test-session.ts";
import { getCurrentJob, subscribeToJobChanges } from "../jobs/index.ts";

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
      webDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/bootstrap",
      headers: { cookie: sessionCookie },
    });

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
      webDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });
    const sessionCookie = await loginTestSession(app);

    const firstRun = await app.inject({
      method: "POST",
      url: "/api/rescan",
      headers: { cookie: sessionCookie },
    });

    expect(firstRun.statusCode).toBe(HTTP_STATUS.ok);
    expect(firstRun.json()).toEqual({ hashed: 1, unchanged: 0, removed: 0 });

    const secondRun = await app.inject({
      method: "POST",
      url: "/api/rescan",
      headers: { cookie: sessionCookie },
    });

    expect(secondRun.json()).toEqual({ hashed: 0, unchanged: 1, removed: 0 });
  });

  it("re-hashes every file via POST /api/rescan when forceRehash is true", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    await fs.mkdir(path.join(tempDir, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildApp({
      webDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });
    const sessionCookie = await loginTestSession(app);

    await app.inject({
      method: "POST",
      url: "/api/rescan",
      headers: { cookie: sessionCookie },
    });

    const forced = await app.inject({
      method: "POST",
      url: "/api/rescan",
      payload: { forceRehash: true },
      headers: { cookie: sessionCookie },
    });

    expect(forced.json()).toEqual({ hashed: 1, unchanged: 0, removed: 0 });
  });

  it("publishes rescan progress to the job store and clears it on completion via POST /api/rescan", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    await fs.mkdir(path.join(tempDir, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildApp({
      webDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });
    const sessionCookie = await loginTestSession(app);
    const observedJobs: unknown[] = [];
    const unsubscribe = subscribeToJobChanges((job) => observedJobs.push(job));

    const response = await app.inject({
      method: "POST",
      url: "/api/rescan",
      headers: { cookie: sessionCookie },
    });

    unsubscribe();
    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(observedJobs[0]).toMatchObject({ type: "rescan", done: 0 });
    expect(getCurrentJob()).toBeNull();
  });

  it("reports files missing from the (unconfigured) destination via POST /api/reconcile", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    await fs.mkdir(path.join(tempDir, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildApp({
      webDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });
    const sessionCookie = await loginTestSession(app);
    const observedJobs: unknown[] = [];
    const unsubscribe = subscribeToJobChanges((job) => observedJobs.push(job));

    const response = await app.inject({
      method: "POST",
      url: "/api/reconcile",
      headers: { cookie: sessionCookie },
    });

    unsubscribe();
    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toMatchObject({
      missingOnDestination: ["core-routes-test/a.png"],
    });
    expect(observedJobs[0]).toMatchObject({ type: "reconcile", done: 0 });
    expect(getCurrentJob()).toBeNull();
  });

  it("returns conversion candidates via GET /api/convert/plan", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    await fs.mkdir(path.join(tempDir, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "core-routes-test", "forest.png"), "fake-bytes-forest");
    const app = buildApp({
      webDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/convert/plan",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual({
      candidates: [
        {
          relativePath: "core-routes-test/forest.png",
          kind: "image",
          destinationPath: "core-routes-test/forest.webp",
        },
      ],
      conflicts: [],
    });
  });

  it("converts eligible files and publishes progress via POST /api/convert", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    const minimalPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    await fs.mkdir(path.join(tempDir, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "core-routes-test", "forest.png"), minimalPng);
    const app = buildApp({
      webDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });
    const sessionCookie = await loginTestSession(app);
    const observedJobs: unknown[] = [];
    const unsubscribe = subscribeToJobChanges((job) => observedJobs.push(job));

    const response = await app.inject({
      method: "POST",
      url: "/api/convert",
      headers: { cookie: sessionCookie },
    });

    unsubscribe();
    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual({ converted: 1, conflicts: 0 });
    expect(observedJobs[0]).toMatchObject({ type: "convert", done: 0 });
    expect(getCurrentJob()).toBeNull();
  });

  it("reports the batch diff via GET /api/diff", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    const app = buildApp({
      webDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });
    const sessionCookie = await loginTestSession(app);

    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}added.png`, size: 1, mtime: new Date(), hash: "hash-added" })
      .execute();

    const response = await app.inject({
      method: "GET",
      url: "/api/diff",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    const body = response.json();

    expect(body.added).toContain(`${PREFIX}added.png`);
  });

  it("applies a batch in dry run mode via POST /api/apply, leaving remote_assets untouched", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "core-routes-test-"));
    await fs.mkdir(path.join(tempDir, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "core-routes-test", "added.png"), "added-bytes");
    await db
      .insertInto("assets")
      .values([
        {
          path: `${PREFIX}added.png`,
          size: 11,
          mtime: new Date(),
          hash: "hash-added",
        },
      ])
      .execute();

    const app = buildApp({
      webDistDir: null,
      assetTreeRoot: tempDir,
      thumbnailCacheDir: path.join(tempDir, "thumbnails"),
    });
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/apply",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toMatchObject({ outcome: "dry_run", added: 1 });

    const remoteRow = await db
      .selectFrom("remote_assets")
      .selectAll()
      .where("path", "=", `${PREFIX}added.png`)
      .executeTakeFirst();
    expect(remoteRow).toBeUndefined();
  });
});
