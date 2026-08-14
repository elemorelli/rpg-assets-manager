import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.ts";
import { HTTP_STATUS } from "../../errors/index.ts";

describe("file routes", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("lists a directory via GET /api/files", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-routes-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");
    const app = buildApp({ frontendDistDir: null, assetTreeRoot: tempDir });

    const response = await app.inject({ method: "GET", url: "/api/files" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual([
      { name: "forest.png", type: "file", size: 14, mtimeMs: expect.any(Number) },
    ]);
  });

  it("rejects an unsafe path with 400", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-routes-"));
    const app = buildApp({ frontendDistDir: null, assetTreeRoot: tempDir });

    const response = await app.inject({ method: "GET", url: "/api/files?path=../escaped" });

    expect(response.statusCode).toBe(HTTP_STATUS.badRequest);
  });

  it("creates a directory via POST /api/files/mkdir", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-routes-"));
    const app = buildApp({ frontendDistDir: null, assetTreeRoot: tempDir });

    const response = await app.inject({
      method: "POST",
      url: "/api/files/mkdir",
      payload: { path: "tiles" },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect((await fs.stat(path.join(tempDir, "tiles"))).isDirectory()).toBe(true);
  });

  it("deletes an entry via DELETE /api/files", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-routes-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");
    const app = buildApp({ frontendDistDir: null, assetTreeRoot: tempDir });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/files",
      payload: { path: "forest.png" },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    await expect(fs.stat(path.join(tempDir, "forest.png"))).rejects.toThrow();
  });

  it("renames an entry via POST /api/files/rename", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-routes-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");
    const app = buildApp({ frontendDistDir: null, assetTreeRoot: tempDir });

    const response = await app.inject({
      method: "POST",
      url: "/api/files/rename",
      payload: { path: "forest.png", newName: "forest-renamed.png" },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect((await fs.stat(path.join(tempDir, "forest-renamed.png"))).isFile()).toBe(true);
  });

  it("moves an entry via POST /api/files/move", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-routes-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");
    const app = buildApp({ frontendDistDir: null, assetTreeRoot: tempDir });

    const response = await app.inject({
      method: "POST",
      url: "/api/files/move",
      payload: { fromPath: "forest.png", toPath: "tiles/forest.png" },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect((await fs.stat(path.join(tempDir, "tiles", "forest.png"))).isFile()).toBe(true);
  });

  it("uploads a file via POST /api/files/upload", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-routes-"));
    const app = buildApp({ frontendDistDir: null, assetTreeRoot: tempDir });

    await app.ready();

    const form = new FormData();
    form.set("path", "tiles");
    form.set("file", new Blob([Buffer.from("fake-png-bytes")]), "forest.png");

    const response = await app.inject({
      method: "POST",
      url: "/api/files/upload",
      payload: form,
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual({ uploaded: "forest.png" });
    expect(await fs.readFile(path.join(tempDir, "tiles", "forest.png"), "utf8")).toBe(
      "fake-png-bytes",
    );
  });

  it("searches for entries by name via GET /api/files/search", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-routes-"));
    await fs.mkdir(path.join(tempDir, "tiles"));
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");
    const app = buildApp({ frontendDistDir: null, assetTreeRoot: tempDir });

    const response = await app.inject({ method: "GET", url: "/api/files/search?q=forest" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual([{ relativePath: "tiles/forest.png", type: "file" }]);
  });
});
