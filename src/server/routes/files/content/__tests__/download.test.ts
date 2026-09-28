import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#server/errors/index.ts";

import { downloadFileHandler } from "../download.ts";

const PARTIAL_CONTENT = 206;

describe("downloadFileHandler", () => {
  let tempDir = "";
  let app: FastifyInstance;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "download-file-"));
    app = Fastify();
    app.get("/download", downloadFileHandler(tempDir));
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("serves the file as an attachment named after the file", async () => {
    await fs.mkdir(path.join(tempDir, "maps"));
    await fs.writeFile(path.join(tempDir, "maps", "forest.png"), "fake-png-bytes");

    const response = await app.inject({ url: "/download?path=maps/forest.png" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers["content-disposition"]).toBe(
      `attachment; filename="forest.png"; filename*=UTF-8''forest.png`,
    );
    expect(response.body).toBe("fake-png-bytes");
  });

  it("falls back to a generic binary mime type for unknown extensions", async () => {
    await fs.writeFile(path.join(tempDir, "sketch.xcf"), "fake-xcf-bytes");

    const response = await app.inject({ url: "/download?path=sketch.xcf" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.headers["content-type"]).toBe("application/octet-stream");
  });

  it("serves a byte range so an interrupted download can resume", async () => {
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    const response = await app.inject({
      url: "/download?path=forest.png",
      headers: { range: "bytes=5-" },
    });

    expect(response.statusCode).toBe(PARTIAL_CONTENT);
    expect(response.body).toBe("png-bytes");
  });

  it("rejects a directory", async () => {
    await fs.mkdir(path.join(tempDir, "maps"));

    const response = await app.inject({ url: "/download?path=maps" });

    expect(response.statusCode).toBe(HTTP_STATUS.badRequest);
  });

  it("rejects a path that escapes the tree root", async () => {
    const response = await app.inject({ url: "/download?path=../escaped.png" });

    expect(response.statusCode).toBe(HTTP_STATUS.badRequest);
  });

  it("responds not found when the file does not exist", async () => {
    const response = await app.inject({ url: "/download?path=missing.png" });

    expect(response.statusCode).toBe(HTTP_STATUS.notFound);
  });
});
