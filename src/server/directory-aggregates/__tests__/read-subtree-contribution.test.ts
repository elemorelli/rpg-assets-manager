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

const { readSubtreeContribution } = await import("../read-subtree-contribution.ts");

describe("readSubtreeContribution", () => {
  let mock: MockDb;

  beforeEach(() => {
    const mockDb = createMockDb();

    currentMockDb = mockDb;
    mock = mockDb as unknown as MockDb;
  });

  it("reads a file's size from the assets table", async () => {
    mock.selectFrom("assets").executeTakeFirst.mockResolvedValueOnce({ size: 14 });

    const contribution = await readSubtreeContribution("tiles/a.png", false);

    expect(contribution).toEqual({ size: 14, fileCount: 1, folderCount: 0 });
  });

  it("returns zero contribution for an untracked file", async () => {
    const contribution = await readSubtreeContribution("tiles/a.png", false);

    expect(contribution).toEqual({ size: 0, fileCount: 0, folderCount: 0 });
  });

  it("reads a directory's recursive totals from the directories table, counting itself as one folder", async () => {
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce({ total_size: 30, file_count: 2, folder_count: 1 });

    const contribution = await readSubtreeContribution("tiles", true);

    expect(contribution).toEqual({ size: 30, fileCount: 2, folderCount: 2 });
  });

  it("returns zero contribution for a directory with no row (never tracked, so its parent's folder_count never counted it either)", async () => {
    const contribution = await readSubtreeContribution("tiles", true);

    expect(contribution).toEqual({ size: 0, fileCount: 0, folderCount: 0 });
  });
});
