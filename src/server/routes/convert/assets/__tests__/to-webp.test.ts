import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { convertToWebp } from "../to-webp.ts";

const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const RIFF_MAGIC_START = 0;
const RIFF_MAGIC_END = 4;
const WEBP_MAGIC_START = 8;
const WEBP_MAGIC_END = 12;

describe("convertToWebp", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("writes a webp file at the destination path", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "convert-to-webp-"));
    const sourcePath = path.join(tempDir, "source.png");
    const destinationPath = path.join(tempDir, "output.webp");
    await fs.writeFile(sourcePath, Buffer.from(MINIMAL_PNG_BASE64, "base64"));

    await convertToWebp(sourcePath, destinationPath);

    const output = await fs.readFile(destinationPath);
    expect(output.subarray(RIFF_MAGIC_START, RIFF_MAGIC_END).toString("ascii")).toBe("RIFF");
    expect(output.subarray(WEBP_MAGIC_START, WEBP_MAGIC_END).toString("ascii")).toBe("WEBP");
  });
});
