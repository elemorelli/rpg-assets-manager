import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS, withHttpErrorHandling } from "#server/errors/index.ts";

import { sendAssetFile } from "../send-asset-file.ts";

const PARTIAL_CONTENT = 206;
const NOT_MODIFIED = 304;
const RANGE_NOT_SATISFIABLE = 416;
const FILE_CONTENT = "fake-png-bytes";

interface TestQuery {
  path: string;
  attachment?: string;
}

const buildTestServer = (rootDir: string): FastifyInstance => {
  const app = Fastify();

  app.get(
    "/file",
    withHttpErrorHandling(async (request, reply) => {
      const query = request.query as TestQuery;

      return sendAssetFile(request, reply, {
        rootDir,
        relativePath: query.path,
        contentType: "image/png",
        attachmentName: query.attachment,
      });
    }),
  );

  return app;
};

describe("sendAssetFile", () => {
  let tempDir = "";
  let app: FastifyInstance;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "send-asset-file-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), FILE_CONTENT);
    app = buildTestServer(tempDir);
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("streams the whole file with the given content type and advertises range support", async () => {
    const response = await app.inject({ url: "/file?path=forest.png" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers["accept-ranges"]).toBe("bytes");
    expect(response.body).toBe(FILE_CONTENT);
  });

  it("serves only the requested byte range", async () => {
    const response = await app.inject({
      url: "/file?path=forest.png",
      headers: { range: "bytes=0-3" },
    });

    expect(response.statusCode).toBe(PARTIAL_CONTENT);
    expect(response.headers["content-range"]).toBe(`bytes 0-3/${FILE_CONTENT.length}`);
    expect(response.body).toBe("fake");
  });

  it("rejects a range past the end of the file", async () => {
    const response = await app.inject({
      url: "/file?path=forest.png",
      headers: { range: "bytes=500-600" },
    });

    expect(response.statusCode).toBe(RANGE_NOT_SATISFIABLE);
  });

  it("answers a conditional request for an unchanged file with not modified", async () => {
    const firstResponse = await app.inject({ url: "/file?path=forest.png" });
    const etag = String(firstResponse.headers.etag);

    const response = await app.inject({
      url: "/file?path=forest.png",
      headers: { "if-none-match": etag },
    });

    expect(response.statusCode).toBe(NOT_MODIFIED);
  });

  it("serves file names containing characters that are special in URLs", async () => {
    const fileName = "100% boss #1.png";

    await fs.writeFile(path.join(tempDir, fileName), FILE_CONTENT);

    const response = await app.inject({
      url: `/file?path=${encodeURIComponent(fileName)}`,
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.body).toBe(FILE_CONTENT);
  });

  it("serves dotfiles like any other file", async () => {
    await fs.writeFile(path.join(tempDir, ".hidden.png"), FILE_CONTENT);

    const response = await app.inject({ url: "/file?path=.hidden.png" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
  });

  it("marks the response as an attachment when given a download name", async () => {
    const response = await app.inject({ url: "/file?path=forest.png&attachment=forest.png" });

    expect(response.headers["content-disposition"]).toBe(
      `attachment; filename="forest.png"; filename*=UTF-8''forest.png`,
    );
  });

  it("responds not found for a missing file", async () => {
    const response = await app.inject({ url: "/file?path=missing.png" });

    expect(response.statusCode).toBe(HTTP_STATUS.notFound);
  });

  it("rejects a directory", async () => {
    await fs.mkdir(path.join(tempDir, "tiles"));

    const response = await app.inject({ url: "/file?path=tiles" });

    expect(response.statusCode).toBe(HTTP_STATUS.badRequest);
  });
});
