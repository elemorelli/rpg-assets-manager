import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { UnsafePathError } from "../../../../utils/safePath.ts";
import { readRawFile } from "../index.ts";

describe("readRawFile", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("returns the file content and mime type for a supported extension", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "raw-file-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "fake-png-bytes");

    const result = await readRawFile(tempDir, "forest.png");

    expect(result.mimeType).toBe("image/png");
    expect(result.content.toString("utf8")).toBe("fake-png-bytes");
  });

  it("rejects a file type with no known mime type", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "raw-file-"));
    await fs.writeFile(path.join(tempDir, "sketch.xcf"), "fake-xcf-bytes");

    await expect(readRawFile(tempDir, "sketch.xcf")).rejects.toThrow();
  });

  it("rejects a path that escapes the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "raw-file-"));

    await expect(readRawFile(tempDir, "../escaped.png")).rejects.toThrow(UnsafePathError);
  });
});
