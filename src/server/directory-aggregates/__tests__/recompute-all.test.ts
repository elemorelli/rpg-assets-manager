import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Kysely } from "kysely";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { recomputeAllDirectoryAggregates } = await import("../recompute-all.ts");

const ASSET_ROWS = [
  { path: "a.png", size: 10 },
  { path: "tiles/b.png", size: 20 },
];

interface InsertedDirectoryRow {
  path: string;
  parent_id: number | null;
  total_size: number;
  file_count: number;
  folder_count: number;
}

describe("recomputeAllDirectoryAggregates", () => {
  let tempDir = "";
  let mock: MockDb;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "recompute-all-"));

    const mockDb = createMockDb();

    currentMockDb = mockDb;
    mock = mockDb as unknown as MockDb;

    let nextId = 1;

    mock.insertInto("directories").executeTakeFirstOrThrow.mockImplementation(() => ({
      id: String(nextId++),
    }));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const seedTree = async (): Promise<void> => {
    await fs.writeFile(path.join(tempDir, "a.png"), "a");
    await fs.mkdir(path.join(tempDir, "tiles", "forest"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tiles", "b.png"), "bb");
    await fs.mkdir(path.join(tempDir, "empty"), { recursive: true });

    mock.selectFrom("assets").execute.mockResolvedValue(ASSET_ROWS);
  };

  const insertedDirectoryRows = (): InsertedDirectoryRow[] =>
    mock
      .insertInto("directories")
      .values.mock.calls.map((call: unknown[]) => call[0] as InsertedDirectoryRow);

  const insertedRowsByPath = (): Map<string, InsertedDirectoryRow> =>
    new Map(insertedDirectoryRows().map((row) => [row.path, row]));

  it("computes recursive totals at every level, including empty directories", async () => {
    await seedTree();

    await recomputeAllDirectoryAggregates(tempDir);

    const byPath = insertedRowsByPath();

    expect(byPath.get("")).toMatchObject({ total_size: 30, file_count: 2, folder_count: 3 });
    expect(byPath.get("tiles")).toMatchObject({ total_size: 20, file_count: 1, folder_count: 1 });
    expect(byPath.get("tiles/forest")).toMatchObject({
      total_size: 0,
      file_count: 0,
      folder_count: 0,
    });
    expect(byPath.get("empty")).toMatchObject({ total_size: 0, file_count: 0, folder_count: 0 });
  });

  it("links every non-root directory to its parent by id", async () => {
    await seedTree();

    await recomputeAllDirectoryAggregates(tempDir);

    const insertedRows = insertedDirectoryRows();
    const idByPath = new Map(insertedRows.map((row, index) => [row.path, index + 1]));
    const byPath = insertedRowsByPath();

    expect(byPath.get("tiles")?.parent_id).toBe(idByPath.get(""));
    expect(byPath.get("tiles/forest")?.parent_id).toBe(idByPath.get("tiles"));
  });

  it("is idempotent: unconditionally clearing the table before every re-insert", async () => {
    await seedTree();

    await recomputeAllDirectoryAggregates(tempDir);
    await recomputeAllDirectoryAggregates(tempDir);

    const TRACKED_DIRECTORY_COUNT = 4;

    expect(mock.deleteFrom("directories").execute).toHaveBeenCalledTimes(2);
    expect(mock.insertInto("directories").values).toHaveBeenCalledTimes(
      TRACKED_DIRECTORY_COUNT * 2,
    );
  });

  it("reflects a directory removed from disk since the last run", async () => {
    await seedTree();

    await recomputeAllDirectoryAggregates(tempDir);

    mock.insertInto("directories").values.mockClear();
    await fs.rm(path.join(tempDir, "empty"), { recursive: true });

    await recomputeAllDirectoryAggregates(tempDir);

    const paths = [...insertedRowsByPath().keys()];

    expect(paths).not.toContain("empty");
  });
});
