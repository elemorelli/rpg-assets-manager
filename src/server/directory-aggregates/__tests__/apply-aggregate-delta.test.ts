import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { applyAggregateDelta } from "../apply-aggregate-delta.ts";
import { ensureDirectoryChain } from "../ensure-directory-chain.ts";

describe("applyAggregateDelta", () => {
  it("applies the delta to the start path and every ancestor up to root", async () => {
    const db = createFakeDb();

    await ensureDirectoryChain(db, "tiles/forest");
    await applyAggregateDelta(db, "tiles/forest", { size: 100, fileCount: 1, folderCount: 0 });

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("tiles/forest")).toMatchObject({ total_size: 100, file_count: 1 });
    expect(byPath.get("tiles")).toMatchObject({ total_size: 100, file_count: 1 });
    expect(byPath.get("")).toMatchObject({ total_size: 100, file_count: 1 });
  });

  it("accumulates across multiple calls", async () => {
    const db = createFakeDb();

    await ensureDirectoryChain(db, "tiles");
    await applyAggregateDelta(db, "tiles", { size: 100, fileCount: 1, folderCount: 0 });
    await applyAggregateDelta(db, "tiles", { size: 50, fileCount: 1, folderCount: 0 });

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("tiles")).toMatchObject({ total_size: 150, file_count: 2 });
  });

  it("supports negative deltas, e.g. when removing content", async () => {
    const db = createFakeDb();

    await ensureDirectoryChain(db, "tiles");
    await applyAggregateDelta(db, "tiles", { size: 100, fileCount: 2, folderCount: 0 });
    await applyAggregateDelta(db, "tiles", { size: -40, fileCount: -1, folderCount: 0 });

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("tiles")).toMatchObject({ total_size: 60, file_count: 1 });
  });

  it("increments folder_count on ancestors but not on the start path itself", async () => {
    const db = createFakeDb();

    await ensureDirectoryChain(db, "tiles");
    await applyAggregateDelta(db, "tiles", { size: 0, fileCount: 0, folderCount: 1 });

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("tiles")).toMatchObject({ folder_count: 1 });
    expect(byPath.get("")).toMatchObject({ folder_count: 1 });
  });

  it("does not affect a sibling branch", async () => {
    const db = createFakeDb();

    await ensureDirectoryChain(db, "tiles");
    await ensureDirectoryChain(db, "tokens");
    await applyAggregateDelta(db, "tiles", { size: 100, fileCount: 1, folderCount: 0 });

    const byPath = new Map(db.rows("directories").map((row) => [row.path, row]));

    expect(byPath.get("tokens")).toMatchObject({ total_size: 0, file_count: 0 });
  });
});
