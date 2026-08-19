import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { useTempDir } from "#server/test-utils/integration-lifecycle.ts";

import { rcloneCheck, rcloneCopy, rcloneDelete, rcloneMoveTo } from "../client.ts";

describe("rclone client (requires the real rclone binary)", () => {
  const sourceDir = useTempDir("rclone-source-");
  const destinationDir = useTempDir("rclone-dest-");

  it("copies listed files from source to destination, preserving relative paths", async () => {
    await fs.mkdir(path.join(sourceDir.path, "tiles"), { recursive: true });
    await fs.writeFile(path.join(sourceDir.path, "tiles", "forest.png"), "forest-bytes");
    await fs.writeFile(path.join(sourceDir.path, "top.png"), "top-bytes");

    await rcloneCopy(sourceDir.path, destinationDir.path, ["tiles/forest.png", "top.png"]);

    expect(await fs.readFile(path.join(destinationDir.path, "tiles", "forest.png"), "utf8")).toBe(
      "forest-bytes",
    );
    expect(await fs.readFile(path.join(destinationDir.path, "top.png"), "utf8")).toBe("top-bytes");
  });

  it("reports each copied file as it completes, not just once at the end", async () => {
    await fs.writeFile(path.join(sourceDir.path, "one.png"), "one-bytes");
    await fs.writeFile(path.join(sourceDir.path, "two.png"), "two-bytes");
    const completedPaths: string[] = [];

    await rcloneCopy(sourceDir.path, destinationDir.path, ["one.png", "two.png"], (relativePath) =>
      completedPaths.push(relativePath),
    );

    expect(completedPaths.sort()).toEqual(["one.png", "two.png"]);
  });

  it("deletes listed files from the destination", async () => {
    await fs.writeFile(path.join(destinationDir.path, "gone.png"), "gone-bytes");

    await rcloneDelete(destinationDir.path, ["gone.png"]);

    await expect(fs.access(path.join(destinationDir.path, "gone.png"))).rejects.toThrow();
  });

  it("reports each deleted file as it completes", async () => {
    await fs.writeFile(path.join(destinationDir.path, "gone-with-progress.png"), "bytes");
    const completedPaths: string[] = [];

    await rcloneDelete(destinationDir.path, ["gone-with-progress.png"], (relativePath) =>
      completedPaths.push(relativePath),
    );

    expect(completedPaths).toEqual(["gone-with-progress.png"]);
  });

  it("moves a file within the destination to a new relative path", async () => {
    await fs.writeFile(path.join(destinationDir.path, "old.png"), "moved-bytes");

    await rcloneMoveTo(destinationDir.path, "old.png", "renamed/new.png");

    expect(await fs.readFile(path.join(destinationDir.path, "renamed", "new.png"), "utf8")).toBe(
      "moved-bytes",
    );
    await expect(fs.access(path.join(destinationDir.path, "old.png"))).rejects.toThrow();
  });

  it("reports matches, one-sided files and content differences between source and destination", async () => {
    await fs.writeFile(path.join(sourceDir.path, "matching.png"), "same-bytes");
    await fs.writeFile(path.join(destinationDir.path, "matching.png"), "same-bytes");
    await fs.writeFile(path.join(sourceDir.path, "only-on-source.png"), "source-only-bytes");
    await fs.writeFile(
      path.join(destinationDir.path, "only-on-destination.png"),
      "dest-only-bytes",
    );
    await fs.writeFile(path.join(sourceDir.path, "changed.png"), "new-bytes");
    await fs.writeFile(path.join(destinationDir.path, "changed.png"), "old-bytes");

    const result = await rcloneCheck(sourceDir.path, destinationDir.path);

    expect(result.matchCount).toBe(1);
    expect(result.missingOnDestination).toEqual(["only-on-source.png"]);
    expect(result.missingOnSource).toEqual(["only-on-destination.png"]);
    expect(result.differs).toEqual(["changed.png"]);
    expect(result.errors).toEqual([]);
  });

  it("reports no differences when source and destination match exactly", async () => {
    await fs.writeFile(path.join(sourceDir.path, "matching.png"), "same-bytes");
    await fs.writeFile(path.join(destinationDir.path, "matching.png"), "same-bytes");

    const result = await rcloneCheck(sourceDir.path, destinationDir.path);

    expect(result.matchCount).toBe(1);
    expect(result.missingOnDestination).toEqual([]);
    expect(result.missingOnSource).toEqual([]);
    expect(result.differs).toEqual([]);
  });

  it("reports checked/total progress while checking", async () => {
    await fs.writeFile(path.join(sourceDir.path, "matching.png"), "same-bytes");
    await fs.writeFile(path.join(destinationDir.path, "matching.png"), "same-bytes");
    const progressUpdates: { done: number; total: number }[] = [];

    await rcloneCheck(sourceDir.path, destinationDir.path, (progress) =>
      progressUpdates.push(progress),
    );

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates.at(-1)).toEqual({ done: 1, total: 1 });
  });

  it("cleans up its temp report directory even when rclone check fails unexpectedly", async () => {
    const missingSourceDir = path.join(sourceDir.path, "does-not-exist");

    const tempDirsBefore = await fs.readdir(os.tmpdir());

    await expect(rcloneCheck(missingSourceDir, destinationDir.path)).rejects.toThrow();

    const tempDirsAfter = await fs.readdir(os.tmpdir());
    const leakedReportDirs = tempDirsAfter.filter(
      (name) => name.startsWith("rclone-check-") && !tempDirsBefore.includes(name),
    );

    expect(leakedReportDirs).toEqual([]);
  });
});
