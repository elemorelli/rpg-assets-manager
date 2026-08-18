import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../db/index.ts";
import { HTTP_STATUS } from "../../errors/index.ts";
import { buildTestApp } from "../../test-utils/build-test-app.ts";
import { destroyDbAfterAll, useTempDir } from "../../test-utils/integration-lifecycle.ts";
import { loginTestSession } from "../../test-utils/login-test-session.ts";

const WEBP_MAGIC_START = 8;
const WEBP_MAGIC_END = 12;

describe("file routes", () => {
  const tempDir = useTempDir("file-routes-");

  destroyDbAfterAll();

  afterEach(async () => {
    // uploadFile() upserts into the assets table as a side effect, so the upload
    // test below leaves a real row behind even though the rest of this file is
    // filesystem-only.
    await db.deleteFrom("assets").where("path", "=", "tiles/forest.png").execute();
  });

  it("lists a directory via GET /api/files", async () => {
    await fs.writeFile(path.join(tempDir.path, "forest.png"), "fake-png-bytes");
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/files",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual([
      { name: "forest.png", type: "file", size: 14, mtimeMs: expect.any(Number) },
    ]);
  });

  it("rejects an unsafe path with 400", async () => {
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/files?path=../escaped",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.badRequest);
  });

  it("creates a directory via POST /api/files/mkdir", async () => {
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/files/mkdir",
      payload: { path: "tiles" },
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect((await fs.stat(path.join(tempDir.path, "tiles"))).isDirectory()).toBe(true);
  });

  it("deletes an entry via DELETE /api/files", async () => {
    await fs.writeFile(path.join(tempDir.path, "forest.png"), "fake-png-bytes");
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "DELETE",
      url: "/api/files",
      payload: { path: "forest.png" },
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    await expect(fs.stat(path.join(tempDir.path, "forest.png"))).rejects.toThrow();
  });

  it("renames an entry via POST /api/files/rename", async () => {
    await fs.writeFile(path.join(tempDir.path, "forest.png"), "fake-png-bytes");
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/files/rename",
      payload: { path: "forest.png", newName: "forest-renamed.png" },
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect((await fs.stat(path.join(tempDir.path, "forest-renamed.png"))).isFile()).toBe(true);
  });

  it("moves an entry via POST /api/files/move", async () => {
    await fs.writeFile(path.join(tempDir.path, "forest.png"), "fake-png-bytes");
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/files/move",
      payload: { fromPath: "forest.png", toPath: "tiles/forest.png" },
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect((await fs.stat(path.join(tempDir.path, "tiles", "forest.png"))).isFile()).toBe(true);
  });

  it("uploads a file via POST /api/files/upload", async () => {
    const app = buildTestApp(tempDir);

    await app.ready();

    const sessionCookie = await loginTestSession(app);
    const form = new FormData();
    form.set("path", "tiles");
    form.set("file", new Blob([Buffer.from("fake-png-bytes")]), "forest.png");

    const response = await app.inject({
      method: "POST",
      url: "/api/files/upload",
      payload: form,
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual({ uploaded: "forest.png" });
    expect(await fs.readFile(path.join(tempDir.path, "tiles", "forest.png"), "utf8")).toBe(
      "fake-png-bytes",
    );
  });

  it("searches for entries by name via GET /api/files/search", async () => {
    await fs.mkdir(path.join(tempDir.path, "tiles"));
    await fs.writeFile(path.join(tempDir.path, "tiles", "forest.png"), "fake-png-bytes");
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/files/search?q=forest",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual([{ relativePath: "tiles/forest.png", type: "file" }]);
  });

  it("serves the raw file content via GET /api/files/raw", async () => {
    await fs.writeFile(path.join(tempDir.path, "forest.png"), "fake-png-bytes");
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/files/raw?path=forest.png",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.body).toBe("fake-png-bytes");
  });

  it("generates a thumbnail via GET /api/files/thumbnail", async () => {
    const minimalPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    await fs.writeFile(
      path.join(tempDir.path, "forest.png"),
      Buffer.from(minimalPngBase64, "base64"),
    );
    const app = buildTestApp(tempDir);
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/files/thumbnail?path=forest.png",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.headers["content-type"]).toBe("image/webp");
    expect(
      Buffer.from(response.rawPayload).subarray(WEBP_MAGIC_START, WEBP_MAGIC_END).toString("ascii"),
    ).toBe("WEBP");
  });
});
