import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { UnsafePathError } from "../../../../../utils/safePath.ts";
import { uploadFile } from "../index.ts";

describe("uploadFile", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("writes the file content at the target path", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));

    await uploadFile(tempDir, "", "forest.png", Buffer.from("fake-png-bytes"));

    expect(await fs.readFile(path.join(tempDir, "forest.png"), "utf8")).toBe("fake-png-bytes");
  });

  it("creates the target directory when it does not exist", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));

    await uploadFile(tempDir, "tiles", "forest.png", Buffer.from("fake-png-bytes"));

    expect(await fs.readFile(path.join(tempDir, "tiles", "forest.png"), "utf8")).toBe(
      "fake-png-bytes",
    );
  });

  it("rejects overwriting an existing file", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));
    await fs.writeFile(path.join(tempDir, "forest.png"), "original");

    await expect(
      uploadFile(tempDir, "", "forest.png", Buffer.from("replacement")),
    ).rejects.toThrow();
  });

  it("rejects a file name that escapes the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));

    await expect(
      uploadFile(tempDir, "", "../escaped.png", Buffer.from("fake-png-bytes")),
    ).rejects.toThrow(UnsafePathError);
  });
});
