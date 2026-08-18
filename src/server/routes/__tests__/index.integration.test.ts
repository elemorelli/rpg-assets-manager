import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { db } from "../../db/index.ts";
import { HTTP_STATUS } from "../../errors/index.ts";
import { buildTestApp } from "../../test-utils/build-test-app.ts";
import {
  cleanupAssetsByPrefix,
  destroyDbAfterAll,
  useCreatedSyncRunIds,
  useTempDir,
} from "../../test-utils/integration-lifecycle.ts";
import { loginTestSession } from "../../test-utils/login-test-session.ts";
import { getCurrentJob, subscribeToJobChanges } from "../jobs/index.ts";

const PREFIX = "core-routes-test/";

describe("core routes (requires DATABASE_URL pointing at a running Postgres)", () => {
  const tempDir = useTempDir("core-routes-test-");
  const createdSyncRunIds = useCreatedSyncRunIds();

  cleanupAssetsByPrefix(PREFIX, ["assets", "remote_assets"]);
  destroyDbAfterAll();

  it("bootstraps the asset tree via POST /api/bootstrap", async () => {
    await fs.mkdir(path.join(tempDir.path, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildTestApp(tempDir);
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
    await fs.mkdir(path.join(tempDir.path, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const firstRun = await app.inject({
      method: "POST",
      url: "/api/rescan",
      headers: { cookie: sessionCookie },
    });

    expect(firstRun.statusCode).toBe(HTTP_STATUS.ok);
    expect(firstRun.json()).toEqual({ hashed: 1, unchanged: 0, removed: 0, renamed: 0 });

    const secondRun = await app.inject({
      method: "POST",
      url: "/api/rescan",
      headers: { cookie: sessionCookie },
    });

    expect(secondRun.json()).toEqual({ hashed: 0, unchanged: 1, removed: 0, renamed: 0 });
  });

  it("re-hashes every file via POST /api/rescan when forceRehash is true", async () => {
    await fs.mkdir(path.join(tempDir.path, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildTestApp(tempDir);
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

    expect(forced.json()).toEqual({ hashed: 1, unchanged: 0, removed: 0, renamed: 0 });
  });

  it("publishes rescan progress to the job store and clears it on completion via POST /api/rescan", async () => {
    await fs.mkdir(path.join(tempDir.path, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildTestApp(tempDir);
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
    await fs.mkdir(path.join(tempDir.path, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, "core-routes-test", "a.png"), "fake-bytes-a");
    const app = buildTestApp(tempDir);
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
    await fs.mkdir(path.join(tempDir.path, "core-routes-test"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir.path, "core-routes-test", "forest.png"),
      "fake-bytes-forest",
    );
    const app = buildTestApp(tempDir);
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

  it("scopes GET /api/convert/plan to the folder given via ?path", async () => {
    await fs.mkdir(path.join(tempDir.path, "core-routes-test", "tiles"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir.path, "core-routes-test", "outside.png"),
      "fake-bytes-outside",
    );
    await fs.writeFile(
      path.join(tempDir.path, "core-routes-test", "tiles", "forest.png"),
      "fake-bytes-forest",
    );
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/convert/plan?path=core-routes-test/tiles",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual({
      candidates: [{ relativePath: "forest.png", kind: "image", destinationPath: "forest.webp" }],
      conflicts: [],
    });
  });

  it("converts eligible files and publishes progress via POST /api/convert", async () => {
    const minimalPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    await fs.mkdir(path.join(tempDir.path, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, "core-routes-test", "forest.png"), minimalPng);
    const app = buildTestApp(tempDir);
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

  it("scopes POST /api/convert to the folder given via the path body, leaving other folders untouched", async () => {
    const minimalPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    await fs.mkdir(path.join(tempDir.path, "core-routes-test", "tiles"), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, "core-routes-test", "outside.png"), minimalPng);
    await fs.writeFile(
      path.join(tempDir.path, "core-routes-test", "tiles", "forest.png"),
      minimalPng,
    );
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/convert",
      headers: { cookie: sessionCookie },
      payload: { path: "core-routes-test/tiles" },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual({ converted: 1, conflicts: 0 });
    await expect(
      fs.access(path.join(tempDir.path, "core-routes-test", "tiles", "forest.webp")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(tempDir.path, "core-routes-test", "outside.png")),
    ).resolves.toBeUndefined();
  });

  it("reports the batch diff via GET /api/diff", async () => {
    const app = buildTestApp(tempDir);
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
    await fs.mkdir(path.join(tempDir.path, "core-routes-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, "core-routes-test", "added.png"), "added-bytes");
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

    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/apply",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    const body = response.json();
    createdSyncRunIds.push(body.syncRunId);
    expect(body).toMatchObject({ outcome: "dry_run", added: 1 });

    const remoteRow = await db
      .selectFrom("remote_assets")
      .selectAll()
      .where("path", "=", `${PREFIX}added.png`)
      .executeTakeFirst();
    expect(remoteRow).toBeUndefined();
  });
});
