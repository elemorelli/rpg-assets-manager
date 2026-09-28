import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { text } from "node:stream/consumers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HttpError } from "#server/errors/index.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { openFileDownload } from "../download.ts";

describe("openFileDownload", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "download-file-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("streams the file content along with its name and mime type", async () => {
    await fs.mkdir(path.join(tempDir, "maps"));
    await fs.writeFile(path.join(tempDir, "maps", "forest.png"), "fake-png-bytes");

    const download = await openFileDownload(tempDir, "maps/forest.png");

    expect(download.fileName).toBe("forest.png");
    expect(download.mimeType).toBe("image/png");
    expect(await text(download.stream)).toBe("fake-png-bytes");
  });

  it("falls back to a generic binary mime type for unknown extensions", async () => {
    await fs.writeFile(path.join(tempDir, "sketch.xcf"), "fake-xcf-bytes");

    const download = await openFileDownload(tempDir, "sketch.xcf");

    download.stream.destroy();

    expect(download.mimeType).toBe("application/octet-stream");
  });

  it("rejects a directory", async () => {
    await fs.mkdir(path.join(tempDir, "maps"));

    await expect(openFileDownload(tempDir, "maps")).rejects.toThrow(HttpError);
  });

  it("rejects a path that escapes the tree root", async () => {
    await expect(openFileDownload(tempDir, "../escaped.png")).rejects.toThrow(UnsafePathError);
  });

  it("fails when the file does not exist", async () => {
    await expect(openFileDownload(tempDir, "missing.png")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
