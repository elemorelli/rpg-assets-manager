import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import type { BatchDiffResult } from "../../diff/index.ts";
import { mirrorRemoteAssets } from "../mirror-remote-assets.ts";

const emptyDiff: BatchDiffResult = {
  added: [],
  modified: [],
  deleted: [],
  renamed: [],
  ambiguousWarnings: [],
};

describe("mirrorRemoteAssets", () => {
  it("inserts a remote_assets row for a newly added asset", async () => {
    const db = createFakeDb();

    db.seed("assets", [{ path: "tiles/forest.png", size: 10, hash: "hash-forest" }]);

    await mirrorRemoteAssets(db, { ...emptyDiff, added: ["tiles/forest.png"] });

    expect(db.rows("remote_assets")).toMatchObject([
      { path: "tiles/forest.png", size: 10, hash: "hash-forest" },
    ]);
  });

  it("upserts an existing remote_assets row for a modified asset", async () => {
    const db = createFakeDb();

    db.seed("assets", [{ path: "tiles/forest.png", size: 20, hash: "hash-forest-v2" }]);
    db.seed("remote_assets", [
      { id: "1", path: "tiles/forest.png", size: 10, hash: "hash-forest-v1" },
    ]);

    await mirrorRemoteAssets(db, { ...emptyDiff, modified: ["tiles/forest.png"] });

    expect(db.rows("remote_assets")).toMatchObject([
      { id: "1", path: "tiles/forest.png", size: 20, hash: "hash-forest-v2" },
    ]);
  });

  it("deletes the remote_assets row for a deleted asset", async () => {
    const db = createFakeDb();

    db.seed("remote_assets", [{ id: "1", path: "tiles/gone.png", size: 1, hash: "hash-gone" }]);

    await mirrorRemoteAssets(db, { ...emptyDiff, deleted: ["tiles/gone.png"] });

    expect(db.rows("remote_assets")).toEqual([]);
  });

  it("updates path, size and hash on the remote_assets row for a renamed asset", async () => {
    const db = createFakeDb();

    db.seed("assets", [{ path: "tiles/new-name.png", size: 30, hash: "hash-renamed" }]);
    db.seed("remote_assets", [{ id: "1", path: "tiles/old-name.png", size: 10, hash: "hash-old" }]);

    await mirrorRemoteAssets(db, {
      ...emptyDiff,
      renamed: [{ oldPath: "tiles/old-name.png", newPath: "tiles/new-name.png" }],
    });

    expect(db.rows("remote_assets")).toMatchObject([
      { id: "1", path: "tiles/new-name.png", size: 30, hash: "hash-renamed" },
    ]);
  });

  it("applies every kind of change in a single diff without cross-contamination", async () => {
    const db = createFakeDb();

    db.seed("assets", [
      { path: "added.png", size: 1, hash: "hash-added" },
      { path: "renamed-to.png", size: 2, hash: "hash-renamed" },
    ]);
    db.seed("remote_assets", [
      { id: "1", path: "deleted.png", size: 3, hash: "hash-deleted" },
      { id: "2", path: "renamed-from.png", size: 9, hash: "hash-stale" },
    ]);

    await mirrorRemoteAssets(db, {
      added: ["added.png"],
      modified: [],
      deleted: ["deleted.png"],
      renamed: [{ oldPath: "renamed-from.png", newPath: "renamed-to.png" }],
      ambiguousWarnings: [],
    });

    const paths = db.rows("remote_assets").map((row) => row.path);

    expect(paths).toEqual(expect.arrayContaining(["added.png", "renamed-to.png"]));
    expect(paths).not.toEqual(expect.arrayContaining(["deleted.png", "renamed-from.png"]));
  });
});
