import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rcloneCheck, rcloneCopy, rcloneDelete, rcloneMoveTo } from "../client.ts";

let sourceDir: string;
let destinationDir: string;

afterEach(async () => {
  await fs.rm(sourceDir, { recursive: true, force: true });
  await fs.rm(destinationDir, { recursive: true, force: true });
});

describe("rclone client (requires the real rclone binary)", () => {
  it("copies listed files from source to destination, preserving relative paths", async () => {
    sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-source-"));
    destinationDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-dest-"));
    await fs.mkdir(path.join(sourceDir, "tiles"), { recursive: true });
    await fs.writeFile(path.join(sourceDir, "tiles", "forest.png"), "forest-bytes");
    await fs.writeFile(path.join(sourceDir, "top.png"), "top-bytes");

    await rcloneCopy(sourceDir, destinationDir, ["tiles/forest.png", "top.png"]);

    expect(await fs.readFile(path.join(destinationDir, "tiles", "forest.png"), "utf8")).toBe(
      "forest-bytes",
    );
    expect(await fs.readFile(path.join(destinationDir, "top.png"), "utf8")).toBe("top-bytes");
  });

  it("deletes listed files from the destination", async () => {
    sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-source-"));
    destinationDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-dest-"));
    await fs.writeFile(path.join(destinationDir, "gone.png"), "gone-bytes");

    await rcloneDelete(destinationDir, ["gone.png"]);

    await expect(fs.access(path.join(destinationDir, "gone.png"))).rejects.toThrow();
  });

  it("moves a file within the destination to a new relative path", async () => {
    sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-source-"));
    destinationDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-dest-"));
    await fs.writeFile(path.join(destinationDir, "old.png"), "moved-bytes");

    await rcloneMoveTo(destinationDir, "old.png", "renamed/new.png");

    expect(await fs.readFile(path.join(destinationDir, "renamed", "new.png"), "utf8")).toBe(
      "moved-bytes",
    );
    await expect(fs.access(path.join(destinationDir, "old.png"))).rejects.toThrow();
  });

  it("reports matches, one-sided files and content differences between source and destination", async () => {
    sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-source-"));
    destinationDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-dest-"));
    await fs.writeFile(path.join(sourceDir, "matching.png"), "same-bytes");
    await fs.writeFile(path.join(destinationDir, "matching.png"), "same-bytes");
    await fs.writeFile(path.join(sourceDir, "only-on-source.png"), "source-only-bytes");
    await fs.writeFile(path.join(destinationDir, "only-on-destination.png"), "dest-only-bytes");
    await fs.writeFile(path.join(sourceDir, "changed.png"), "new-bytes");
    await fs.writeFile(path.join(destinationDir, "changed.png"), "old-bytes");

    const result = await rcloneCheck(sourceDir, destinationDir);

    expect(result.matchCount).toBe(1);
    expect(result.missingOnDestination).toEqual(["only-on-source.png"]);
    expect(result.missingOnSource).toEqual(["only-on-destination.png"]);
    expect(result.differs).toEqual(["changed.png"]);
    expect(result.errors).toEqual([]);
  });

  it("reports no differences when source and destination match exactly", async () => {
    sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-source-"));
    destinationDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-dest-"));
    await fs.writeFile(path.join(sourceDir, "matching.png"), "same-bytes");
    await fs.writeFile(path.join(destinationDir, "matching.png"), "same-bytes");

    const result = await rcloneCheck(sourceDir, destinationDir);

    expect(result.matchCount).toBe(1);
    expect(result.missingOnDestination).toEqual([]);
    expect(result.missingOnSource).toEqual([]);
    expect(result.differs).toEqual([]);
  });
});
