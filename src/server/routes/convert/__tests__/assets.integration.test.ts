import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { getLocalHashIndex } from "#server/asset-index-cache/index.ts";
import { db } from "#server/db/index.ts";
import {
  cleanupAssetsByPrefix,
  destroyDbAfterAll,
  useTempDir,
} from "#server/test-utils/integration-lifecycle.ts";

import { convertAssets } from "../assets.ts";

const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const SILENT_WAV_BASE64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

const PREFIX = "convert-assets-test/";

describe("convertAssets (requires DATABASE_URL pointing at a running Postgres)", () => {
  const tempDir = useTempDir("convert-assets-test-");

  cleanupAssetsByPrefix(PREFIX);
  destroyDbAfterAll();

  beforeEach(async () => {
    await fs.mkdir(path.join(tempDir.path, "convert-assets-test"), { recursive: true });
  });

  it("converts eligible files, deletes the originals, and reports progress", async () => {
    await fs.mkdir(path.join(tempDir.path, "convert-assets-test", "legacy-pack"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(tempDir.path, "convert-assets-test", "forest.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );
    await fs.writeFile(
      path.join(tempDir.path, "convert-assets-test", "legacy-pack", "old-tile.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );
    await fs.writeFile(path.join(tempDir.path, "convert-assets-test", "legacy-pack", ".skip"), "");

    const progressUpdates: { done: number; total: number }[] = [];

    const summary = await convertAssets(
      db,
      path.join(tempDir.path, "convert-assets-test"),
      "convert-assets-test",
      (progress) => progressUpdates.push(progress),
    );

    expect(summary).toEqual({ converted: 1, overwritten: 0 });
    expect(progressUpdates[0]).toEqual({ done: 0, total: 1 });
    expect(progressUpdates.at(-1)).toEqual({ done: 1, total: 1 });

    await expect(
      fs.access(path.join(tempDir.path, "convert-assets-test", "forest.webp")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(tempDir.path, "convert-assets-test", "forest.png")),
    ).rejects.toThrow();

    // Skipped directory is untouched: original still there, no .webp created.
    await expect(
      fs.access(path.join(tempDir.path, "convert-assets-test", "legacy-pack", "old-tile.png")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(tempDir.path, "convert-assets-test", "legacy-pack", "old-tile.webp")),
    ).rejects.toThrow();
  });

  it("overwrites an existing destination file instead of skipping the conversion", async () => {
    await fs.writeFile(
      path.join(tempDir.path, "convert-assets-test", "forest.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );
    await fs.writeFile(
      path.join(tempDir.path, "convert-assets-test", "forest.webp"),
      "stale-placeholder-content",
    );

    const summary = await convertAssets(
      db,
      path.join(tempDir.path, "convert-assets-test"),
      "convert-assets-test",
    );

    expect(summary).toEqual({ converted: 1, overwritten: 1 });
    await expect(
      fs.access(path.join(tempDir.path, "convert-assets-test", "forest.png")),
    ).rejects.toThrow();

    const destinationContent = await fs.readFile(
      path.join(tempDir.path, "convert-assets-test", "forest.webp"),
    );

    expect(destinationContent.toString()).not.toEqual("stale-placeholder-content");
  });

  it("converts both an image and an audio file in one pass", async () => {
    await fs.writeFile(
      path.join(tempDir.path, "convert-assets-test", "forest.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );
    await fs.mkdir(path.join(tempDir.path, "convert-assets-test", "audio"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir.path, "convert-assets-test", "audio", "theme.wav"),
      Buffer.from(SILENT_WAV_BASE64, "base64"),
    );

    const summary = await convertAssets(
      db,
      path.join(tempDir.path, "convert-assets-test"),
      "convert-assets-test",
    );

    expect(summary).toEqual({ converted: 2, overwritten: 0 });
    await expect(
      fs.access(path.join(tempDir.path, "convert-assets-test", "audio", "theme.ogg")),
    ).resolves.toBeUndefined();
  });

  it("swaps the source asset row for a new row at the converted destination", async () => {
    await fs.writeFile(
      path.join(tempDir.path, "convert-assets-test", "forest.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );
    await db
      .insertInto("assets")
      .values({
        path: `${PREFIX}forest.png`,
        size: 14,
        mtime: new Date(),
        hash: "known-source-hash",
      })
      .execute();

    await convertAssets(db, path.join(tempDir.path, "convert-assets-test"), "convert-assets-test");

    const sourceRow = await db
      .selectFrom("assets")
      .select("id")
      .where("path", "=", `${PREFIX}forest.png`)
      .executeTakeFirst();

    expect(sourceRow).toBeUndefined();

    const destinationRow = await db
      .selectFrom("assets")
      .select(["hash", "size"])
      .where("path", "=", `${PREFIX}forest.webp`)
      .executeTakeFirstOrThrow();

    expect(destinationRow.hash).not.toEqual("known-source-hash");
    expect(Number(destinationRow.size)).toBeGreaterThan(0);
  });

  it("carries the source file's pre-conversion hash onto the destination row", async () => {
    await fs.writeFile(
      path.join(tempDir.path, "convert-assets-test", "forest.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );
    await db
      .insertInto("assets")
      .values({
        path: `${PREFIX}forest.png`,
        size: 14,
        mtime: new Date(),
        hash: "known-source-hash",
      })
      .execute();

    await convertAssets(db, path.join(tempDir.path, "convert-assets-test"), "convert-assets-test");

    const destinationRow = await db
      .selectFrom("assets")
      .select("previous_hash")
      .where("path", "=", `${PREFIX}forest.webp`)
      .executeTakeFirstOrThrow();

    expect(destinationRow.previous_hash).toBe("known-source-hash");
  });

  it("writes destination asset rows under the given db path prefix, not the scoped folder", async () => {
    await fs.mkdir(path.join(tempDir.path, "convert-assets-test", "tiles"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir.path, "convert-assets-test", "tiles", "forest.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );

    await convertAssets(
      db,
      path.join(tempDir.path, "convert-assets-test", "tiles"),
      "convert-assets-test/tiles",
    );

    const destinationRow = await db
      .selectFrom("assets")
      .select("path")
      .where("path", "=", `${PREFIX}tiles/forest.webp`)
      .executeTakeFirst();

    expect(destinationRow).toBeDefined();
  });

  it("invalidates the cached local hash index so the conversion is reflected immediately", async () => {
    await fs.writeFile(
      path.join(tempDir.path, "convert-assets-test", "forest.png"),
      Buffer.from(MINIMAL_PNG_BASE64, "base64"),
    );
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}forest.png`, size: 14, mtime: new Date(), hash: "known-hash" })
      .execute();

    await getLocalHashIndex(db);
    await convertAssets(db, path.join(tempDir.path, "convert-assets-test"), "convert-assets-test");
    const index = await getLocalHashIndex(db);

    expect(index.has(`${PREFIX}forest.png`)).toBe(false);
    expect(index.has(`${PREFIX}forest.webp`)).toBe(true);
  });
});
