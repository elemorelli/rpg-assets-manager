import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLocalHashIndex } from "#server/asset-index-cache/index.ts";
import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";
import { createFakeDb } from "#server/test-utils/fake-db.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { uploadFile } from "../upload-file.ts";

const PREFIX = "upload-test/";
const FAKE_PNG_BYTES_LENGTH = Buffer.byteLength("fake-png-bytes");

const uploadableStreamFrom = (content: string, truncated = false) => {
  const stream = Readable.from([Buffer.from(content)]) as Readable & { truncated: boolean };

  stream.truncated = truncated;

  return stream;
};

describe("uploadFile", () => {
  let tempDir = "";
  let db: ReturnType<typeof createFakeDb>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));
    db = createFakeDb();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("writes the file content at the target path", async () => {
    await uploadFile(
      db,
      tempDir,
      "upload-test",
      "forest.png",
      uploadableStreamFrom("fake-png-bytes"),
    );

    expect(await fs.readFile(path.join(tempDir, "upload-test", "forest.png"), "utf8")).toBe(
      "fake-png-bytes",
    );
  });

  it("creates the target directory when it does not exist", async () => {
    await uploadFile(
      db,
      tempDir,
      "upload-test/tiles",
      "forest.png",
      uploadableStreamFrom("fake-png-bytes"),
    );

    expect(
      await fs.readFile(path.join(tempDir, "upload-test", "tiles", "forest.png"), "utf8"),
    ).toBe("fake-png-bytes");
  });

  it("rejects overwriting an existing file with a conflict error", async () => {
    await fs.mkdir(path.join(tempDir, "upload-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "upload-test", "forest.png"), "original");

    const uploadAttempt = uploadFile(
      db,
      tempDir,
      "upload-test",
      "forest.png",
      uploadableStreamFrom("replacement"),
    );

    await expect(uploadAttempt).rejects.toThrow(HttpError);
    await expect(uploadAttempt).rejects.toMatchObject({ statusCode: HTTP_STATUS.conflict });
    expect(await fs.readFile(path.join(tempDir, "upload-test", "forest.png"), "utf8")).toBe(
      "original",
    );
  });

  it("replaces an existing file's content when overwrite is true", async () => {
    await fs.mkdir(path.join(tempDir, "upload-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "upload-test", "forest.png"), "original");

    await uploadFile(
      db,
      tempDir,
      "upload-test",
      "forest.png",
      uploadableStreamFrom("replacement"),
      true,
    );

    expect(await fs.readFile(path.join(tempDir, "upload-test", "forest.png"), "utf8")).toBe(
      "replacement",
    );
  });

  it("rejects a file name that escapes the tree root", async () => {
    await expect(
      uploadFile(
        db,
        tempDir,
        "upload-test",
        "../../escaped.png",
        uploadableStreamFrom("fake-png-bytes"),
      ),
    ).rejects.toThrow(UnsafePathError);
  });

  it("records the uploaded file's hash in the assets table", async () => {
    await uploadFile(
      db,
      tempDir,
      "upload-test",
      "forest.png",
      uploadableStreamFrom("fake-png-bytes"),
    );

    const row = await db
      .selectFrom("assets")
      .select(["hash", "size"])
      .where("path", "=", `${PREFIX}forest.png`)
      .executeTakeFirstOrThrow();

    // Real Postgres returns bigint columns as strings; fake-db echoes back
    // whatever JS value was inserted, so this is a number here.
    expect(row.size).toEqual(FAKE_PNG_BYTES_LENGTH);
    expect(row.hash).not.toEqual("");
  });

  it("overwrites a stale assets row left over from a file deleted outside the app", async () => {
    await fs.mkdir(path.join(tempDir, "upload-test"), { recursive: true });
    await db
      .insertInto("assets")
      .values({
        path: `${PREFIX}forest.png`,
        size: 1,
        mtime: new Date(),
        hash: "stale-hash",
      })
      .execute();

    await uploadFile(
      db,
      tempDir,
      "upload-test",
      "forest.png",
      uploadableStreamFrom("fake-png-bytes"),
    );

    const row = await db
      .selectFrom("assets")
      .select(["hash"])
      .where("path", "=", `${PREFIX}forest.png`)
      .executeTakeFirstOrThrow();

    expect(row.hash).not.toEqual("stale-hash");
  });

  it("deletes the partial file and rejects with a 413 when the stream was truncated", async () => {
    await expect(
      uploadFile(
        db,
        tempDir,
        "upload-test",
        "forest.png",
        uploadableStreamFrom("fake-png-bytes", true),
      ),
    ).rejects.toThrow(HttpError);

    await expect(fs.access(path.join(tempDir, "upload-test", "forest.png"))).rejects.toThrow();
  });

  it("records the uploaded file's size in the directory aggregate and its ancestors", async () => {
    await uploadFile(
      db,
      tempDir,
      "upload-test/tiles",
      "forest.png",
      uploadableStreamFrom("fake-png-bytes"),
    );

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("upload-test/tiles")).toMatchObject({
      total_size: FAKE_PNG_BYTES_LENGTH,
      file_count: 1,
    });
    expect(byPath.get("upload-test")).toMatchObject({
      total_size: FAKE_PNG_BYTES_LENGTH,
      file_count: 1,
    });
    expect(byPath.get("")).toMatchObject({
      total_size: FAKE_PNG_BYTES_LENGTH,
      file_count: 1,
    });
  });

  it("adjusts the aggregate by the size delta only, without double-counting the file, on overwrite", async () => {
    await fs.mkdir(path.join(tempDir, "upload-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "upload-test", "forest.png"), "original");

    await uploadFile(
      db,
      tempDir,
      "upload-test",
      "forest.png",
      uploadableStreamFrom("original"),
      true,
    );

    await uploadFile(
      db,
      tempDir,
      "upload-test",
      "forest.png",
      uploadableStreamFrom("a-longer-replacement"),
      true,
    );

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("upload-test")).toMatchObject({
      total_size: Buffer.byteLength("a-longer-replacement"),
      file_count: 1,
    });
  });

  it("invalidates the cached local hash index so the next read reflects the upload", async () => {
    await getLocalHashIndex(db);

    await uploadFile(
      db,
      tempDir,
      "upload-test",
      "forest.png",
      uploadableStreamFrom("fake-png-bytes"),
    );
    const index = await getLocalHashIndex(db);

    expect(index.has(`${PREFIX}forest.png`)).toBe(true);
  });
});
