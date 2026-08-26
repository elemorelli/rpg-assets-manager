import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Kysely } from "kysely";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { buildDirectoryTree } = await import("../tree.ts");

const createMock = (): MockDb => {
  const mockDb = createMockDb();

  currentMockDb = mockDb;

  return mockDb as unknown as MockDb;
};

describe("buildDirectoryTree", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("keys every directory's children by its own path, omitting files", async () => {
    const mock = createMock();

    mock.selectFrom("assets").execute.mockResolvedValueOnce([]);
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "directory-tree-"));
    await fs.mkdir(path.join(tempDir, "tiles", "legacy-pack"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "map.png"), "fake-png-bytes");
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");

    const tree = await buildDirectoryTree(tempDir);

    expect(tree).toEqual({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
      "tiles/legacy-pack": [],
    });
  });

  it("returns just the root entry, empty, for an empty tree", async () => {
    const mock = createMock();

    mock.selectFrom("assets").execute.mockResolvedValueOnce([]);
    mock.selectFrom("remote_assets").execute.mockResolvedValueOnce([]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "directory-tree-"));

    const tree = await buildDirectoryTree(tempDir);

    expect(tree).toEqual({ "": [] });
  });

  it("marks a directory as having pending sync when a nested descendant changed", async () => {
    const mock = createMock();

    mock
      .selectFrom("assets")
      .execute.mockResolvedValueOnce([
        { path: "tiles/forests/leaf.png", hash: "local-hash", previous_hash: null },
      ]);
    mock
      .selectFrom("remote_assets")
      .execute.mockResolvedValueOnce([
        { path: "tiles/forests/leaf.png", hash: "remote-hash", size: 1 },
      ]);

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "directory-tree-"));
    await fs.mkdir(path.join(tempDir, "tiles", "forests"), { recursive: true });

    const tree = await buildDirectoryTree(tempDir);

    expect(tree[""]).toEqual([{ name: "tiles", type: "directory", hasPendingSync: true }]);
    expect(tree.tiles).toEqual([{ name: "forests", type: "directory", hasPendingSync: true }]);
  });
});
