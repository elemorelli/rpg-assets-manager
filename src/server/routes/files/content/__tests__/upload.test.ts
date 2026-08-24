import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { Kysely } from "kysely";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getLocalHashIndex } from "#server/asset-index-cache/index.ts";
import type { DB } from "#server/db/index.ts";
import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

const PREFIX = "upload-test/";
const FAKE_PNG_BYTES_LENGTH = Buffer.byteLength("fake-png-bytes");

const uploadableStreamFrom = (content: string, truncated = false) => {
  const stream = Readable.from([Buffer.from(content)]) as Readable & { truncated: boolean };

  stream.truncated = truncated;

  return stream;
};

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { uploadFile } = await import("../upload.ts");

describe("uploadFile", () => {
  let tempDir = "";
  let mock: MockDb;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-file-"));

    const mockDb = createMockDb();

    currentMockDb = mockDb;
    mock = mockDb as unknown as MockDb;

    let nextDirectoryId = 1;

    mock.insertInto("directories").executeTakeFirstOrThrow.mockImplementation(() => ({
      id: String(nextDirectoryId++),
    }));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("writes the file content at the target path", async () => {
    await uploadFile(tempDir, "upload-test", "forest.png", uploadableStreamFrom("fake-png-bytes"));

    expect(await fs.readFile(path.join(tempDir, "upload-test", "forest.png"), "utf8")).toBe(
      "fake-png-bytes",
    );
  });

  it("creates the target directory when it does not exist", async () => {
    await uploadFile(
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
        tempDir,
        "upload-test",
        "../../escaped.png",
        uploadableStreamFrom("fake-png-bytes"),
      ),
    ).rejects.toThrow(UnsafePathError);
  });

  it("records the uploaded file's hash in the assets table", async () => {
    await uploadFile(tempDir, "upload-test", "forest.png", uploadableStreamFrom("fake-png-bytes"));

    expect(mock.insertInto).toHaveBeenCalledWith("assets");

    const [values] = mock.insertInto("assets").values.mock.calls[0];

    expect(values.path).toBe(`${PREFIX}forest.png`);
    expect(values.size).toEqual(FAKE_PNG_BYTES_LENGTH);
    expect(values.hash).not.toEqual("");
  });

  it("deletes the partial file and rejects with a 413 when the stream was truncated", async () => {
    await expect(
      uploadFile(
        tempDir,
        "upload-test",
        "forest.png",
        uploadableStreamFrom("fake-png-bytes", true),
      ),
    ).rejects.toThrow(HttpError);

    await expect(fs.access(path.join(tempDir, "upload-test", "forest.png"))).rejects.toThrow();
  });

  it("records the uploaded file's size in the directory aggregate and its ancestors", async () => {
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "3", total_size: 0, file_count: 0, folder_count: 0 })
      .mockResolvedValueOnce({ id: "2", total_size: 0, file_count: 0, folder_count: 0 })
      .mockResolvedValueOnce({ id: "1", total_size: 0, file_count: 0, folder_count: 0 });

    await uploadFile(
      tempDir,
      "upload-test/tiles",
      "forest.png",
      uploadableStreamFrom("fake-png-bytes"),
    );

    const expectedSet = { total_size: FAKE_PNG_BYTES_LENGTH, file_count: 1, folder_count: 0 };

    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(1, expectedSet);
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(2, expectedSet);
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(3, expectedSet);
  });

  it("adjusts the aggregate by the size delta only, without double-counting the file, when a row already exists", async () => {
    const previousSize = 1;

    mock.selectFrom("assets").executeTakeFirst.mockResolvedValueOnce({ size: previousSize });
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        id: "2",
        total_size: previousSize,
        file_count: 1,
        folder_count: 0,
      })
      .mockResolvedValueOnce({ id: "1", total_size: previousSize, file_count: 1, folder_count: 0 });

    await uploadFile(
      tempDir,
      "upload-test",
      "forest.png",
      uploadableStreamFrom("fake-png-bytes"),
      true,
    );

    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(1, {
      total_size: FAKE_PNG_BYTES_LENGTH,
      file_count: 1,
      folder_count: 0,
    });
  });

  it("invalidates the cached local hash index so the next read reflects the upload", async () => {
    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { path: `${PREFIX}forest.png`, hash: "some-hash", previous_hash: null },
      ]);

    await getLocalHashIndex();

    await uploadFile(tempDir, "upload-test", "forest.png", uploadableStreamFrom("fake-png-bytes"));
    const index = await getLocalHashIndex();

    expect(index.has(`${PREFIX}forest.png`)).toBe(true);
  });
});
