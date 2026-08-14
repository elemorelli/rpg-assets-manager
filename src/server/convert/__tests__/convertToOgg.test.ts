import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { convertToOgg } from "../convertToOgg.ts";

const SILENT_WAV_BASE64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const OGG_MAGIC_START = 0;
const OGG_MAGIC_END = 4;

describe("convertToOgg", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("writes an ogg file at the destination path", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "convert-to-ogg-"));
    const sourcePath = path.join(tempDir, "source.wav");
    const destinationPath = path.join(tempDir, "output.ogg");
    await fs.writeFile(sourcePath, Buffer.from(SILENT_WAV_BASE64, "base64"));

    await convertToOgg(sourcePath, destinationPath);

    const output = await fs.readFile(destinationPath);
    expect(output.subarray(OGG_MAGIC_START, OGG_MAGIC_END).toString("ascii")).toBe("OggS");
  });
});
