import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { generateThumbnail } from "../generate.ts";

const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const RIFF_MAGIC_START = 0;
const RIFF_MAGIC_END = 4;
const WEBP_MAGIC_START = 8;
const WEBP_MAGIC_END = 12;

describe("generateThumbnail", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("writes a webp file at the destination path", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "generate-thumbnail-"));
    const sourcePath = path.join(tempDir, "source.png");
    const destinationPath = path.join(tempDir, "thumb.webp");
    await fs.writeFile(sourcePath, Buffer.from(MINIMAL_PNG_BASE64, "base64"));

    await generateThumbnail(sourcePath, destinationPath);

    const output = await fs.readFile(destinationPath);
    expect(output.subarray(RIFF_MAGIC_START, RIFF_MAGIC_END).toString("ascii")).toBe("RIFF");
    expect(output.subarray(WEBP_MAGIC_START, WEBP_MAGIC_END).toString("ascii")).toBe("WEBP");
  });
});
