import { describe, expect, it } from "vitest";

import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

import { recordAssetRenames } from "../record-asset-renames.ts";

describe("recordAssetRenames", () => {
  it("inserts one row per rename pair", async () => {
    const mockDb = createMockDb();
    const mock = mockDb as unknown as MockDb;

    await recordAssetRenames(mockDb, [
      { oldPath: "a.png", newPath: "b.png" },
      { oldPath: "c.png", newPath: "d.png" },
    ]);

    expect(mock.insertInto("asset_renames").values.mock.calls).toEqual([
      [{ old_path: "a.png", new_path: "b.png" }],
      [{ old_path: "c.png", new_path: "d.png" }],
    ]);
  });

  it("does nothing when there are no renames", async () => {
    const mockDb = createMockDb();
    const mock = mockDb as unknown as MockDb;

    await recordAssetRenames(mockDb, []);

    expect(mock.insertInto).not.toHaveBeenCalled();
    expect(mock.updateTable).not.toHaveBeenCalled();
  });

  it("clears previous_hash on the renamed row's new path once the rename is recorded", async () => {
    const mockDb = createMockDb();
    const mock = mockDb as unknown as MockDb;

    await recordAssetRenames(mockDb, [{ oldPath: "a.png", newPath: "b.png" }]);

    expect(mock.updateTable("assets").set).toHaveBeenCalledWith({ previous_hash: null });
    expect(mock.updateTable("assets").where).toHaveBeenCalledWith("path", "=", "b.png");
  });
});
