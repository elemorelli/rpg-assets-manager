import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { recordAssetRenames } from "../record-asset-renames.ts";

describe("recordAssetRenames", () => {
  it("inserts one row per rename pair", async () => {
    const db = createFakeDb();

    await recordAssetRenames(db, [
      { oldPath: "a.png", newPath: "b.png" },
      { oldPath: "c.png", newPath: "d.png" },
    ]);

    expect(db.rows("asset_renames")).toMatchObject([
      { old_path: "a.png", new_path: "b.png" },
      { old_path: "c.png", new_path: "d.png" },
    ]);
  });

  it("does nothing when there are no renames", async () => {
    const db = createFakeDb();

    await recordAssetRenames(db, []);

    expect(db.rows("asset_renames")).toEqual([]);
  });
});
