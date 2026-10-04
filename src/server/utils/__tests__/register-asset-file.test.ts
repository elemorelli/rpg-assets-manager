import type { Kysely } from "kysely";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { registerAssetFile } = await import("../register-asset-file.ts");

const FILE_SIZE = 42;
const MTIME = new Date("2026-10-04T12:00:00Z");

describe("registerAssetFile", () => {
  let mock: MockDb;

  beforeEach(() => {
    const mockDb = createMockDb();

    currentMockDb = mockDb;
    mock = mockDb as unknown as MockDb;

    let nextDirectoryId = 1;

    mock.insertInto("directories").executeTakeFirstOrThrow.mockImplementation(() => ({
      id: String(nextDirectoryId++),
    }));
  });

  it("writes the given tags into the asset row", async () => {
    await registerAssetFile("music/battle.ogg", {
      size: FILE_SIZE,
      mtime: MTIME,
      hash: "abc",
      tags: ["combat", "epic"],
    });

    const [values] = mock.insertInto("assets").values.mock.calls[0];

    expect(values).toEqual({
      path: "music/battle.ogg",
      size: FILE_SIZE,
      mtime: MTIME,
      hash: "abc",
      tags: ["combat", "epic"],
    });
  });

  it("leaves the tags column out when no tags are given", async () => {
    await registerAssetFile("music/battle.ogg", { size: FILE_SIZE, mtime: MTIME, hash: "abc" });

    const [values] = mock.insertInto("assets").values.mock.calls[0];

    expect(values).not.toHaveProperty("tags");
  });
});
