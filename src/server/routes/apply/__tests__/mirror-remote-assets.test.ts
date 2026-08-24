import { describe, expect, it } from "vitest";

import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

import type { BatchDiffResult } from "../../diff/index.ts";
import { mirrorRemoteAssets, planRemoteAssetChanges } from "../mirror-remote-assets.ts";

const emptyDiff: BatchDiffResult = {
  added: [],
  modified: [],
  deleted: [],
  renamed: [],
  ambiguousWarnings: [],
};

describe("planRemoteAssetChanges", () => {
  it("plans no operations for an empty diff", () => {
    expect(planRemoteAssetChanges(emptyDiff, new Map())).toEqual([]);
  });

  it("plans an upsert for each added path", () => {
    const assetsByPath = new Map([
      ["a.png", { size: "1", hash: "hash-a" }],
      ["b.png", { size: "2", hash: "hash-b" }],
    ]);

    const operations = planRemoteAssetChanges(
      { ...emptyDiff, added: ["a.png", "b.png"] },
      assetsByPath,
    );

    expect(operations).toEqual([
      { type: "upsert", path: "a.png", size: "1", hash: "hash-a" },
      { type: "upsert", path: "b.png", size: "2", hash: "hash-b" },
    ]);
  });

  it("plans an upsert for a modified path", () => {
    const assetsByPath = new Map([["c.png", { size: "3", hash: "hash-c-v2" }]]);

    const operations = planRemoteAssetChanges({ ...emptyDiff, modified: ["c.png"] }, assetsByPath);

    expect(operations).toEqual([{ type: "upsert", path: "c.png", size: "3", hash: "hash-c-v2" }]);
  });

  it("plans a delete for each deleted path, without needing an asset lookup", () => {
    const operations = planRemoteAssetChanges({ ...emptyDiff, deleted: ["gone.png"] }, new Map());

    expect(operations).toEqual([{ type: "delete", path: "gone.png" }]);
  });

  it("plans a rename using the asset looked up by the new path", () => {
    const assetsByPath = new Map([["new-name.png", { size: "5", hash: "hash-renamed" }]]);

    const operations = planRemoteAssetChanges(
      { ...emptyDiff, renamed: [{ oldPath: "old-name.png", newPath: "new-name.png" }] },
      assetsByPath,
    );

    expect(operations).toEqual([
      {
        type: "rename",
        oldPath: "old-name.png",
        newPath: "new-name.png",
        size: "5",
        hash: "hash-renamed",
      },
    ]);
  });

  it("plans every kind of operation together for a combined diff", () => {
    const assetsByPath = new Map([
      ["added.png", { size: "1", hash: "hash-added" }],
      ["renamed-to.png", { size: "2", hash: "hash-renamed" }],
    ]);

    const operations = planRemoteAssetChanges(
      {
        added: ["added.png"],
        modified: [],
        deleted: ["deleted.png"],
        renamed: [{ oldPath: "renamed-from.png", newPath: "renamed-to.png" }],
        ambiguousWarnings: [],
      },
      assetsByPath,
    );

    expect(operations).toEqual([
      { type: "upsert", path: "added.png", size: "1", hash: "hash-added" },
      { type: "delete", path: "deleted.png" },
      {
        type: "rename",
        oldPath: "renamed-from.png",
        newPath: "renamed-to.png",
        size: "2",
        hash: "hash-renamed",
      },
    ]);
  });

  it("throws when an added path has no matching asset row", () => {
    expect(() =>
      planRemoteAssetChanges({ ...emptyDiff, added: ["missing.png"] }, new Map()),
    ).toThrow(/no asset row found for path "missing.png"/);
  });

  it("throws when a renamed path's new name has no matching asset row", () => {
    const diff = { ...emptyDiff, renamed: [{ oldPath: "old.png", newPath: "missing.png" }] };

    expect(() => planRemoteAssetChanges(diff, new Map())).toThrow(
      /no asset row found for path "missing.png"/,
    );
  });
});

// The decision of which operation applies to which path is covered above by
// planRemoteAssetChanges's own tests. This only exercises the wiring from a
// planned operation to the correct Kysely call (insert/delete/update).
describe("mirrorRemoteAssets", () => {
  it("applies an upsert, a delete and a rename against remote_assets", async () => {
    const mockDb = createMockDb();
    const mock = mockDb as unknown as MockDb;

    mock.selectFrom("assets").execute.mockResolvedValueOnce([
      { path: "added.png", size: 1, hash: "hash-added" },
      { path: "renamed-to.png", size: 2, hash: "hash-renamed" },
    ]);

    const diff: BatchDiffResult = {
      added: ["added.png"],
      modified: [],
      deleted: ["deleted.png"],
      renamed: [{ oldPath: "renamed-from.png", newPath: "renamed-to.png" }],
      ambiguousWarnings: [],
    };

    await mirrorRemoteAssets(mockDb, diff);

    expect(mock.insertInto("remote_assets").values).toHaveBeenCalledWith({
      path: "added.png",
      size: 1,
      hash: "hash-added",
    });
    expect(mock.deleteFrom("remote_assets").where).toHaveBeenCalledWith("path", "=", "deleted.png");
    expect(mock.updateTable("remote_assets").set).toHaveBeenCalledWith(
      expect.objectContaining({ path: "renamed-to.png", size: 2, hash: "hash-renamed" }),
    );
    expect(mock.updateTable("remote_assets").where).toHaveBeenCalledWith(
      "path",
      "=",
      "renamed-from.png",
    );
  });

  it("skips the assets lookup when the diff has nothing to add, modify or rename", async () => {
    const mockDb = createMockDb();
    const mock = mockDb as unknown as MockDb;

    const diff: BatchDiffResult = {
      added: [],
      modified: [],
      deleted: ["deleted.png"],
      renamed: [],
      ambiguousWarnings: [],
    };

    await mirrorRemoteAssets(mockDb, diff);

    expect(mock.selectFrom).not.toHaveBeenCalledWith("assets");
    expect(mock.deleteFrom("remote_assets").where).toHaveBeenCalledWith("path", "=", "deleted.png");
  });
});
