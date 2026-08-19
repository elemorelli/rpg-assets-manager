import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { recomputeAllDirectoryAggregates } from "../recompute-all.ts";

describe("recomputeAllDirectoryAggregates", () => {
  let tempDir = "";
  let db: ReturnType<typeof createFakeDb>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "recompute-all-"));
    db = createFakeDb();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const seedTree = async (): Promise<void> => {
    await fs.writeFile(path.join(tempDir, "a.png"), "a");
    await fs.mkdir(path.join(tempDir, "tiles", "forest"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tiles", "b.png"), "bb");
    await fs.mkdir(path.join(tempDir, "empty"), { recursive: true });

    await db
      .insertInto("assets")
      .values({ path: "a.png", size: 10, mtime: new Date(), hash: "hash-a" })
      .execute();
    await db
      .insertInto("assets")
      .values({ path: "tiles/b.png", size: 20, mtime: new Date(), hash: "hash-b" })
      .execute();
  };

  it("computes recursive totals at every level, including empty directories", async () => {
    await seedTree();

    await recomputeAllDirectoryAggregates(db, tempDir);

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

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

    await recomputeAllDirectoryAggregates(db, tempDir);

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(Number(byPath.get("tiles")?.parent_id)).toBe(Number(byPath.get("")?.id));
    expect(Number(byPath.get("tiles/forest")?.parent_id)).toBe(Number(byPath.get("tiles")?.id));
  });

  it("is idempotent: running it twice does not duplicate rows", async () => {
    await seedTree();

    await recomputeAllDirectoryAggregates(db, tempDir);
    await recomputeAllDirectoryAggregates(db, tempDir);

    const TRACKED_DIRECTORY_COUNT = 4;

    expect(db.rows("directories")).toHaveLength(TRACKED_DIRECTORY_COUNT);
  });

  it("reflects a directory removed from disk since the last run", async () => {
    await seedTree();
    await recomputeAllDirectoryAggregates(db, tempDir);

    await fs.rm(path.join(tempDir, "empty"), { recursive: true });
    await recomputeAllDirectoryAggregates(db, tempDir);

    const paths = db.rows("directories").map((row) => row.path);

    expect(paths).not.toContain("empty");
  });
});
