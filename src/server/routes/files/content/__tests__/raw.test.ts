import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#server/errors/index.ts";

import { rawFileHandler } from "../raw.ts";

const PARTIAL_CONTENT = 206;

describe("rawFileHandler", () => {
  let tempDir = "";
  let app: FastifyInstance;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "raw-file-"));
    app = Fastify();
    app.get("/raw", rawFileHandler(tempDir));
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("serves the file content with the mime type for its extension", async () => {
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    const response = await app.inject({ url: "/raw?path=forest.png" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers["content-disposition"]).toBeUndefined();
    expect(response.body).toBe("fake-png-bytes");
  });

  it("serves a byte range so audio can seek without downloading the whole file", async () => {
    await fs.writeFile(path.join(tempDir, "theme.ogg"), "fake-ogg-bytes");

    const response = await app.inject({
      url: "/raw?path=theme.ogg",
      headers: { range: "bytes=5-7" },
    });

    expect(response.statusCode).toBe(PARTIAL_CONTENT);
    expect(response.headers["content-type"]).toBe("audio/ogg");
    expect(response.body).toBe("ogg");
  });

  it("rejects a file type with no known mime type", async () => {
    await fs.writeFile(path.join(tempDir, "sketch.xcf"), "fake-xcf-bytes");

    const response = await app.inject({ url: "/raw?path=sketch.xcf" });

    expect(response.statusCode).toBe(HTTP_STATUS.badRequest);
  });

  it("rejects a path that escapes the tree root", async () => {
    const response = await app.inject({ url: "/raw?path=../escaped.png" });

    expect(response.statusCode).toBe(HTTP_STATUS.badRequest);
  });
});
