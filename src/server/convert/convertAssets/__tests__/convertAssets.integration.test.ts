import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { convertAssets } from "../index.ts";

const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const SILENT_WAV_BASE64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

describe("convertAssets", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("converts eligible files, deletes the originals, and reports progress", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "convert-assets-test-"));
    await fs.mkdir(path.join(tempDir, "tiles", "legacy-pack"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "tiles", "forest.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );
    await fs.writeFile(
      path.join(tempDir, "tiles", "legacy-pack", "old-tile.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );
    await fs.writeFile(path.join(tempDir, "tiles", "legacy-pack", ".skip"), "");
    await fs.mkdir(path.join(tempDir, "audio"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "audio", "theme.wav"),
      Buffer.from(SILENT_WAV_BASE64, "base64"),
    );

    const progressUpdates: { done: number; total: number }[] = [];

    const summary = await convertAssets(tempDir, (progress) => progressUpdates.push(progress));

    expect(summary).toEqual({ converted: 2, conflicts: 0 });
    expect(progressUpdates[0]).toEqual({ done: 0, total: 2 });
    expect(progressUpdates.at(-1)).toEqual({ done: 2, total: 2 });

    await expect(fs.access(path.join(tempDir, "tiles", "forest.webp"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(tempDir, "audio", "theme.ogg"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(tempDir, "tiles", "forest.png"))).rejects.toThrow();
    await expect(fs.access(path.join(tempDir, "audio", "theme.wav"))).rejects.toThrow();

    // Skipped directory is untouched: original still there, no .webp created.
    await expect(
      fs.access(path.join(tempDir, "tiles", "legacy-pack", "old-tile.png")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(tempDir, "tiles", "legacy-pack", "old-tile.webp")),
    ).rejects.toThrow();
  });
});
