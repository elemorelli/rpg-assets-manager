import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buffer } from "node:stream/consumers";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { createZipStream, downloadZipHandler, resolveZipSelections } from "../download-zip.ts";

// Every zip archive starts with a local file header: "PK\x03\x04".
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

describe("resolveZipSelections", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "download-zip-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("resolves a file path to a file selection", async () => {
    await fs.mkdir(path.join(tempDir, "maps"));
    await fs.writeFile(path.join(tempDir, "maps", "forest.png"), "png");

    const selections = await resolveZipSelections(tempDir, ["maps/forest.png"]);

    expect(selections).toEqual([{ type: "file", relativePath: "maps/forest.png" }]);
  });

  it("resolves a directory path to every file nested under it, relative to that directory", async () => {
    await fs.mkdir(path.join(tempDir, "maps", "tiles", "forest"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "maps", "tiles", "grass.png"), "a");
    await fs.writeFile(path.join(tempDir, "maps", "tiles", "forest", "oak.png"), "b");

    const selections = await resolveZipSelections(tempDir, ["maps/tiles"]);

    expect(selections).toHaveLength(1);
    expect(selections[0]).toMatchObject({ type: "directory", relativePath: "maps/tiles" });

    const nestedFiles = selections[0]?.type === "directory" ? selections[0].nestedFiles : [];

    expect([...nestedFiles].sort()).toEqual(["forest/oak.png", "grass.png"]);
  });

  it("normalizes requested paths before resolving them", async () => {
    await fs.writeFile(path.join(tempDir, "forest.png"), "png");

    const selections = await resolveZipSelections(tempDir, ["./forest.png"]);

    expect(selections).toEqual([{ type: "file", relativePath: "forest.png" }]);
  });

  it("rejects an empty selection", async () => {
    await expect(resolveZipSelections(tempDir, [])).rejects.toThrow(HttpError);
  });

  it("rejects the tree root", async () => {
    await expect(resolveZipSelections(tempDir, [""])).rejects.toThrow(HttpError);
  });

  it("rejects a path that escapes the tree root", async () => {
    await expect(resolveZipSelections(tempDir, ["../escaped"])).rejects.toThrow(UnsafePathError);
  });

  it("fails when a requested path does not exist", async () => {
    await expect(resolveZipSelections(tempDir, ["missing.png"])).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});

describe("createZipStream", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "zip-stream-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("writes every planned entry into the archive under its archive path", async () => {
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    const zipStream = createZipStream(tempDir, [
      { relativePath: "forest.png", archivePath: "maps/forest.png" },
    ]);
    const archive = await buffer(zipStream);

    expect(archive.includes("maps/forest.png")).toBe(true);
    expect(archive.includes("fake-png-bytes")).toBe(true);
  });

  it("fails the stream instead of crashing when a planned file vanished before it was read", async () => {
    const zipStream = createZipStream(tempDir, [
      { relativePath: "vanished.png", archivePath: "vanished.png" },
    ]);

    await expect(buffer(zipStream)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("downloadZipHandler", () => {
  let tempDir = "";
  let app: FastifyInstance;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "download-zip-handler-"));
    await fs.mkdir(path.join(tempDir, "maps", "tiles"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "maps", "forest.png"), "forest-bytes");
    await fs.writeFile(path.join(tempDir, "maps", "tiles", "grass.png"), "grass-bytes");

    app = Fastify();
    app.get("/download-zip", downloadZipHandler(tempDir));
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("streams a single folder as a zip named after the folder", async () => {
    const response = await app.inject({ url: "/download-zip?path=maps/tiles" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.headers["content-type"]).toBe("application/zip");
    expect(response.headers["content-disposition"]).toBe(
      `attachment; filename="tiles.zip"; filename*=UTF-8''tiles.zip`,
    );
    expect(response.rawPayload.subarray(0, ZIP_SIGNATURE.length)).toEqual(ZIP_SIGNATURE);
    expect(response.rawPayload.includes("tiles/grass.png")).toBe(true);
    expect(response.rawPayload.includes("grass-bytes")).toBe(true);
  });

  it("names a multi-entry selection after the containing folder and packs every entry", async () => {
    const response = await app.inject({
      url: "/download-zip?path=maps/forest.png&path=maps/tiles",
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.headers["content-disposition"]).toBe(
      `attachment; filename="maps-selection.zip"; filename*=UTF-8''maps-selection.zip`,
    );
    expect(response.rawPayload.includes("forest-bytes")).toBe(true);
    expect(response.rawPayload.includes("grass-bytes")).toBe(true);
  });

  it("rejects a request without any path", async () => {
    const response = await app.inject({ url: "/download-zip" });

    expect(response.statusCode).toBe(HTTP_STATUS.badRequest);
  });

  it("rejects the tree root", async () => {
    const response = await app.inject({ url: "/download-zip?path=" });

    expect(response.statusCode).toBe(HTTP_STATUS.badRequest);
  });

  it("rejects a path that escapes the tree root", async () => {
    const response = await app.inject({ url: "/download-zip?path=../escaped" });

    expect(response.statusCode).toBe(HTTP_STATUS.badRequest);
  });

  it("responds not found when a requested path does not exist", async () => {
    const response = await app.inject({ url: "/download-zip?path=maps/missing.png" });

    expect(response.statusCode).toBe(HTTP_STATUS.notFound);
  });
});
