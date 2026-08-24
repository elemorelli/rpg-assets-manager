import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Kysely } from "kysely";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getLocalHashIndex } from "#server/asset-index-cache/index.ts";
import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";
import { hashBuffer } from "#server/utils/hash.ts";

const PREFIX = "rescan-test/";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { rescanAssets } = await import("../rescan.ts");

describe("rescanAssets", () => {
  let tempDir = "";
  let mock: MockDb;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rescan-test-"));
    await fs.mkdir(path.join(tempDir, "rescan-test"), { recursive: true });

    const mockDb = createMockDb();

    currentMockDb = mockDb;
    mock = mockDb as unknown as MockDb;

    let nextDirectoryId = 1;

    mock.insertInto("directories").executeTakeFirstOrThrow.mockImplementation(() => ({
      id: String(nextDirectoryId++),
    }));
    mock.deleteFrom("directories").execute.mockResolvedValue(undefined);
    // recomputeAllDirectoryAggregates's own build step always issues one more
    // selectFrom("assets").execute() after rescanAssets' own previousRows query;
    // tests that don't care about aggregate output stage an empty batch for it.
    mock.selectFrom("assets").execute.mockResolvedValue([]);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("hashes files that have no previous snapshot", async () => {
    await fs.writeFile(path.join(tempDir, "rescan-test", "stays.png"), "stays");
    await fs.writeFile(path.join(tempDir, "rescan-test", "removed.png"), "removed");

    const summary = await rescanAssets(tempDir);

    expect(summary).toEqual({ hashed: 2, unchanged: 0, removed: 0, renamed: 0 });
  });

  it("leaves a file alone when its size and mtime still match the previous snapshot", async () => {
    await fs.writeFile(path.join(tempDir, "rescan-test", "stays.png"), "stays");

    const stat = await fs.stat(path.join(tempDir, "rescan-test", "stays.png"));

    mock.selectFrom("assets").execute.mockResolvedValueOnce([
      {
        path: `${PREFIX}stays.png`,
        size: stat.size,
        mtime: new Date(Math.trunc(stat.mtimeMs)),
        hash: "irrelevant-hash",
      },
    ]);

    const summary = await rescanAssets(tempDir);

    expect(summary).toEqual({ hashed: 0, unchanged: 1, removed: 0, renamed: 0 });
  });

  it("re-hashes every file when forceRehash is set, even if size and mtime match", async () => {
    await fs.writeFile(path.join(tempDir, "rescan-test", "stays.png"), "stays");

    const stat = await fs.stat(path.join(tempDir, "rescan-test", "stays.png"));

    mock.selectFrom("assets").execute.mockResolvedValueOnce([
      {
        path: `${PREFIX}stays.png`,
        size: stat.size,
        mtime: new Date(Math.trunc(stat.mtimeMs)),
        hash: "irrelevant-hash",
      },
    ]);

    const summary = await rescanAssets(tempDir, { forceRehash: true });

    expect(summary).toEqual({ hashed: 1, unchanged: 0, removed: 0, renamed: 0 });
  });

  it("removes a previous snapshot whose path no longer exists on disk", async () => {
    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([
        { path: `${PREFIX}gone.png`, size: 1, mtime: new Date(), hash: "gone-hash" },
      ]);

    const summary = await rescanAssets(tempDir);

    expect(summary).toEqual({ hashed: 0, unchanged: 0, removed: 1, renamed: 0 });
    expect(mock.deleteFrom).toHaveBeenCalledWith("assets");
  });

  it("keeps the same identity and reports a rename when a hash matches a removed path", async () => {
    const content = "same-content";
    const hash = await hashBuffer(Buffer.from(content));

    await fs.writeFile(path.join(tempDir, "rescan-test", "after.png"), content);

    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([
        { path: `${PREFIX}before.png`, size: Buffer.byteLength(content), mtime: new Date(0), hash },
      ]);

    const summary = await rescanAssets(tempDir);

    expect(summary).toEqual({ hashed: 1, unchanged: 0, removed: 0, renamed: 1 });
    expect(mock.updateTable("assets").set).toHaveBeenCalledWith(
      expect.objectContaining({ path: `${PREFIX}after.png` }),
    );
  });

  it("recomputes directory aggregates to reflect the post-rescan state", async () => {
    const fileSize = Buffer.byteLength("stays");

    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ path: `${PREFIX}stays.png`, size: fileSize }]);

    await fs.writeFile(path.join(tempDir, "rescan-test", "stays.png"), "stays");

    await rescanAssets(tempDir);

    const insertedRows: { path: string; total_size: number; file_count: number }[] = mock
      .insertInto("directories")
      .values.mock.calls.map(
        (call: unknown[]) => call[0] as { path: string; total_size: number; file_count: number },
      );
    const rescanTestRow = insertedRows.find((row) => row.path === "rescan-test");

    expect(rescanTestRow).toMatchObject({ total_size: fileSize, file_count: 1 });
  });

  it("reports progress via the onProgress callback", async () => {
    await fs.writeFile(path.join(tempDir, "rescan-test", "one.png"), "one");
    await fs.writeFile(path.join(tempDir, "rescan-test", "two.png"), "two");

    const progressUpdates: { done: number; total: number; detail?: string }[] = [];

    await rescanAssets(tempDir, {}, (progress) => progressUpdates.push(progress));

    expect(progressUpdates[0]).toMatchObject({ done: 0, total: 2 });
    expect(progressUpdates[0]?.detail).toMatch(/\.png$/);
    expect(progressUpdates.at(-1)).toEqual({ done: 2, total: 2 });
  });

  it("invalidates the cached local hash index after a rescan removes a deleted file", async () => {
    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { path: `${PREFIX}removed.png`, size: 1, mtime: new Date(), hash: "removed-hash" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ path: `${PREFIX}stays.png`, hash: "h", previous_hash: null }]);

    await getLocalHashIndex();
    const summary = await rescanAssets(tempDir);
    const index = await getLocalHashIndex();

    expect(summary.removed).toBe(1);
    expect(index.has(`${PREFIX}removed.png`)).toBe(false);
    expect(index.has(`${PREFIX}stays.png`)).toBe(true);
  });
});
