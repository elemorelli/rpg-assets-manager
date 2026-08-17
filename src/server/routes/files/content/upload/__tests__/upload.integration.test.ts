import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { uploadFile } from "../upload-file.ts";

const PREFIX = "upload-test/";

describe("uploadFile (requires DATABASE_URL pointing at a running Postgres)", () => {
  let tempDir = "";

  afterEach(async () => {
    await db.deleteFrom("assets").where("path", "like", `${PREFIX}%`).execute();

    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("writes the file content at the target path", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));

    await uploadFile(db, tempDir, "upload-test", "forest.png", Buffer.from("fake-png-bytes"));

    expect(await fs.readFile(path.join(tempDir, "upload-test", "forest.png"), "utf8")).toBe(
      "fake-png-bytes",
    );
  });

  it("creates the target directory when it does not exist", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));

    await uploadFile(db, tempDir, "upload-test/tiles", "forest.png", Buffer.from("fake-png-bytes"));

    expect(
      await fs.readFile(path.join(tempDir, "upload-test", "tiles", "forest.png"), "utf8"),
    ).toBe("fake-png-bytes");
  });

  it("rejects overwriting an existing file", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));
    await fs.mkdir(path.join(tempDir, "upload-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "upload-test", "forest.png"), "original");

    await expect(
      uploadFile(db, tempDir, "upload-test", "forest.png", Buffer.from("replacement")),
    ).rejects.toThrow();
  });

  it("rejects a file name that escapes the tree root", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));

    await expect(
      uploadFile(db, tempDir, "upload-test", "../../escaped.png", Buffer.from("fake-png-bytes")),
    ).rejects.toThrow(UnsafePathError);
  });

  it("records the uploaded file's hash in the assets table", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));

    await uploadFile(db, tempDir, "upload-test", "forest.png", Buffer.from("fake-png-bytes"));

    const row = await db
      .selectFrom("assets")
      .select(["hash", "size"])
      .where("path", "=", `${PREFIX}forest.png`)
      .executeTakeFirstOrThrow();

    expect(row.size).toEqual("14");
    expect(row.hash).not.toEqual("");
  });

  it("overwrites a stale assets row left over from a file deleted outside the app", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));
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

    await uploadFile(db, tempDir, "upload-test", "forest.png", Buffer.from("fake-png-bytes"));

    const row = await db
      .selectFrom("assets")
      .select(["hash"])
      .where("path", "=", `${PREFIX}forest.png`)
      .executeTakeFirstOrThrow();

    expect(row.hash).not.toEqual("stale-hash");
  });
});
