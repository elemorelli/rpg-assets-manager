import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveThumbnail } from "../resolve-thumbnail.ts";

const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const WEBP_MAGIC_START = 8;
const WEBP_MAGIC_END = 12;

describe("resolveThumbnail", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("generates and caches a thumbnail keyed by content hash", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "thumbnail-"));
    const assetTreeRoot = path.join(tempDir, "tree");
    const thumbnailCacheDir = path.join(tempDir, "cache");
    await fs.mkdir(assetTreeRoot, { recursive: true });
    await fs.writeFile(
      path.join(assetTreeRoot, "forest.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );

    const cachePath = await resolveThumbnail(assetTreeRoot, thumbnailCacheDir, "forest.png");

    expect(path.dirname(cachePath)).toBe(thumbnailCacheDir);
    const cachedFile = await fs.readFile(cachePath);
    expect(cachedFile.subarray(WEBP_MAGIC_START, WEBP_MAGIC_END).toString("ascii")).toBe("WEBP");
  });

  it("reuses the cached thumbnail for a duplicate file with the same content", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "thumbnail-"));
    const assetTreeRoot = path.join(tempDir, "tree");
    const thumbnailCacheDir = path.join(tempDir, "cache");
    await fs.mkdir(assetTreeRoot, { recursive: true });
    const pngBytes = Buffer.from(MINIMAL_PNG_BASE64, "base64");
    await fs.writeFile(path.join(assetTreeRoot, "forest.png"), pngBytes);
    await fs.writeFile(path.join(assetTreeRoot, "forest-copy.png"), pngBytes);

    const firstCachePath = await resolveThumbnail(assetTreeRoot, thumbnailCacheDir, "forest.png");
    const secondCachePath = await resolveThumbnail(
      assetTreeRoot,
      thumbnailCacheDir,
      "forest-copy.png",
    );

    expect(secondCachePath).toBe(firstCachePath);
  });

  it("rejects a non-image file", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "thumbnail-"));
    const assetTreeRoot = path.join(tempDir, "tree");
    const thumbnailCacheDir = path.join(tempDir, "cache");
    await fs.mkdir(assetTreeRoot, { recursive: true });
    await fs.writeFile(path.join(assetTreeRoot, "ambient.wav"), "fake-wav-bytes");

    await expect(
      resolveThumbnail(assetTreeRoot, thumbnailCacheDir, "ambient.wav"),
    ).rejects.toThrow();
  });
});
