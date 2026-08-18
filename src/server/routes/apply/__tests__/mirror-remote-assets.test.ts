import { describe, expect, it, vi } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import type { BatchDiffResult } from "../../diff/index.ts";
import { mirrorRemoteAssets } from "../mirror-remote-assets.ts";

// The decision of which operation applies to which path is covered, without any
// DB involved, by plan-remote-asset-changes.test.ts. This test only exercises the
// wiring from a planned operation to the correct Kysely call (insert/delete/update).
describe("mirrorRemoteAssets", () => {
  it("applies an upsert, a delete and a rename against remote_assets", async () => {
    const db = createFakeDb();

    db.seed("assets", [
      { path: "added.png", size: 1, hash: "hash-added" },
      { path: "renamed-to.png", size: 2, hash: "hash-renamed" },
    ]);
    db.seed("remote_assets", [
      { id: "1", path: "deleted.png", size: 3, hash: "hash-deleted" },
      { id: "2", path: "renamed-from.png", size: 9, hash: "hash-stale" },
    ]);

    const diff: BatchDiffResult = {
      added: ["added.png"],
      modified: [],
      deleted: ["deleted.png"],
      renamed: [{ oldPath: "renamed-from.png", newPath: "renamed-to.png" }],
      ambiguousWarnings: [],
    };

    await mirrorRemoteAssets(db, diff);

    const rowsByPath = new Map(db.rows("remote_assets").map((row) => [row.path, row]));

    expect(rowsByPath.get("added.png")).toMatchObject({ size: 1, hash: "hash-added" });
    expect(rowsByPath.get("renamed-to.png")).toMatchObject({
      id: "2",
      size: 2,
      hash: "hash-renamed",
    });
    expect(rowsByPath.has("deleted.png")).toBe(false);
    expect(rowsByPath.has("renamed-from.png")).toBe(false);
  });

  it("skips the assets lookup when the diff has nothing to add, modify or rename", async () => {
    const db = createFakeDb();

    db.seed("remote_assets", [{ id: "1", path: "deleted.png", size: 3, hash: "hash-deleted" }]);

    const diff: BatchDiffResult = {
      added: [],
      modified: [],
      deleted: ["deleted.png"],
      renamed: [],
      ambiguousWarnings: [],
    };

    // Real Postgres rejects `WHERE path IN ()` with a syntax error, which fake-db's
    // "in" operator doesn't reproduce (it just matches nothing), so this asserts the
    // lookup query is skipped entirely rather than relying on it failing here too.
    const selectFromSpy = vi.spyOn(db, "selectFrom");

    await mirrorRemoteAssets(db, diff);

    expect(selectFromSpy).not.toHaveBeenCalledWith("assets");
    expect(db.rows("remote_assets").some((row) => row.path === "deleted.png")).toBe(false);
  });
});
