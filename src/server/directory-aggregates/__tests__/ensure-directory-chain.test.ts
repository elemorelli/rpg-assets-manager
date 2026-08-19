import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { ensureDirectoryChain } from "../ensure-directory-chain.ts";

describe("ensureDirectoryChain", () => {
  it("creates the root row when it does not exist yet", async () => {
    const db = createFakeDb();

    await ensureDirectoryChain(db, "");

    const rows = db.rows("directories");

    expect(rows).toEqual([expect.objectContaining({ path: "", parent_id: null })]);
  });

  it("creates every missing ancestor with the correct parent linkage", async () => {
    const db = createFakeDb();

    await ensureDirectoryChain(db, "tiles/forest");

    const rows = db.rows("directories");
    const byPath = new Map(rows.map((row) => [row.path, row]));

    const root = byPath.get("");
    const tiles = byPath.get("tiles");
    const forest = byPath.get("tiles/forest");

    expect(root).toBeDefined();
    expect(Number(tiles?.parent_id)).toBe(Number(root?.id));
    expect(Number(forest?.parent_id)).toBe(Number(tiles?.id));
  });

  it("returns the id of the resolved directory", async () => {
    const db = createFakeDb();

    const directoryId = await ensureDirectoryChain(db, "tiles/forest");

    const row = db.rows("directories").find((row) => row.path === "tiles/forest");

    expect(directoryId).toBe(Number(row?.id));
  });

  it("does not duplicate rows when called twice for the same path", async () => {
    const db = createFakeDb();

    await ensureDirectoryChain(db, "tiles/forest");
    await ensureDirectoryChain(db, "tiles/forest");

    const rows = db.rows("directories");

    const ROOT_AND_TWO_ANCESTORS_COUNT = 3;

    expect(rows).toHaveLength(ROOT_AND_TWO_ANCESTORS_COUNT);
  });

  it("reuses already-existing ancestors instead of recreating them", async () => {
    const db = createFakeDb();

    await ensureDirectoryChain(db, "tiles");
    await ensureDirectoryChain(db, "tiles/forest");

    const rows = db.rows("directories");
    const byPath = new Map(rows.map((row) => [row.path, row]));

    const ROOT_AND_TWO_ANCESTORS_COUNT = 3;

    expect(rows).toHaveLength(ROOT_AND_TWO_ANCESTORS_COUNT);
    expect(Number(byPath.get("tiles/forest")?.parent_id)).toBe(Number(byPath.get("tiles")?.id));
  });
});
