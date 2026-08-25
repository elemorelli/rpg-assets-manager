import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Kysely } from "kysely";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getLocalHashIndex, getRemoteHashIndex } from "#server/asset-index-cache/index.ts";
import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

const PREFIX = "bootstrap-test/";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { bootstrapAssets } = await import("../bootstrap.ts");

describe("bootstrapAssets", () => {
  let tempDir = "";
  let mock: MockDb;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bootstrap-test-"));
    await fs.mkdir(path.join(tempDir, "bootstrap-test"), { recursive: true });

    const mockDb = createMockDb();

    currentMockDb = mockDb;
    mock = mockDb as unknown as MockDb;

    let nextDirectoryId = 1;

    mock.insertInto("directories").executeTakeFirstOrThrow.mockImplementation(() => ({
      id: String(nextDirectoryId++),
    }));
    mock.deleteFrom("directories").execute.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("writes a matching snapshot to assets and remote_assets", async () => {
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);
    mock.selectFrom("assets").execute.mockResolvedValueOnce([]);

    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "b.png"), "fake-bytes-b");

    const summary = await bootstrapAssets(tempDir);

    expect(summary).toEqual({ inserted: 2, skipped: 0 });

    const sortByPath = (a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path);
    const assetPairs = mock
      .insertInto("assets")
      .values.mock.calls.map((call: unknown[]) => {
        const values = call[0] as { path: string; hash: string };

        return { path: values.path, hash: values.hash };
      })
      .sort(sortByPath);
    const remotePairs = mock
      .insertInto("remote_assets")
      .values.mock.calls.map((call: unknown[]) => {
        const values = call[0] as { path: string; hash: string };

        return { path: values.path, hash: values.hash };
      })
      .sort(sortByPath);

    expect(assetPairs).toEqual(remotePairs);
    expect(assetPairs.map((pair: { path: string }) => pair.path)).toEqual([
      `${PREFIX}a.png`,
      `${PREFIX}b.png`,
    ]);
  });

  it("skips paths already present, so a second run is resumable", async () => {
    mock
      .selectFrom("remote_assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ path: `${PREFIX}a.png` }]);
    mock.selectFrom("assets").execute.mockResolvedValue([]);

    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");

    await bootstrapAssets(tempDir);

    await fs.writeFile(path.join(tempDir, "bootstrap-test", "b.png"), "fake-bytes-b");

    const secondSummary = await bootstrapAssets(tempDir);

    expect(secondSummary).toEqual({ inserted: 1, skipped: 1 });
  });

  it("still inserts a path already scanned by the boot rescan, since only remote_assets tracks bootstrap progress", async () => {
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);
    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([{ path: `${PREFIX}a.png` }])
      .mockResolvedValueOnce([]);

    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");

    const summary = await bootstrapAssets(tempDir);

    expect(summary).toEqual({ inserted: 1, skipped: 0 });
    expect(mock.insertInto("remote_assets").values.mock.calls).toHaveLength(1);
  });

  it("computes directory aggregates for the scanned tree", async () => {
    const fileSize = Buffer.byteLength("fake-bytes-a");

    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);
    mock.selectFrom("assets").execute.mockResolvedValueOnce([
      { path: `${PREFIX}a.png`, size: fileSize },
      { path: `${PREFIX}b.png`, size: fileSize },
    ]);

    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");
    await fs.writeFile(path.join(tempDir, "bootstrap-test", "b.png"), "fake-bytes-b");

    await bootstrapAssets(tempDir);

    const insertedRows: { path: string; total_size: number; file_count: number }[] = mock
      .insertInto("directories")
      .values.mock.calls.map(
        (call: unknown[]) => call[0] as { path: string; total_size: number; file_count: number },
      );
    const bootstrapTestRow = insertedRows.find((row) => row.path === "bootstrap-test");

    expect(bootstrapTestRow).toMatchObject({
      total_size: fileSize * 2,
      file_count: 2,
    });
  });

  it("invalidates both cached hash indexes after writing the snapshot", async () => {
    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ path: `${PREFIX}a.png`, hash: "h", previous_hash: null }]);
    mock
      .selectFrom("remote_assets")
      .execute.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ path: `${PREFIX}a.png`, hash: "h", size: 1 }]);

    await fs.writeFile(path.join(tempDir, "bootstrap-test", "a.png"), "fake-bytes-a");

    await getLocalHashIndex();
    await getRemoteHashIndex();
    await bootstrapAssets(tempDir);
    const localIndex = await getLocalHashIndex();
    const remoteIndex = await getRemoteHashIndex();

    expect(localIndex.has(`${PREFIX}a.png`)).toBe(true);
    expect(remoteIndex.has(`${PREFIX}a.png`)).toBe(true);
  });
});
