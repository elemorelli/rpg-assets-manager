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

const { ensureDirectoryChain } = await import("../ensure-directory-chain.ts");

const EMPTY_AGGREGATE = { total_size: 0, file_count: 0, folder_count: 0 };

const THIRD_CALL = 3;
const FOREST_DIRECTORY_ID = 3;
const EXPECTED_INSERT_CALL_COUNT = 3;

describe("ensureDirectoryChain", () => {
  let mock: MockDb;

  beforeEach(() => {
    const mockDb = createMockDb();

    currentMockDb = mockDb;
    mock = mockDb as unknown as MockDb;
  });

  it("creates the root row when it does not exist yet", async () => {
    mock.insertInto("directories").executeTakeFirstOrThrow.mockResolvedValueOnce({ id: "1" });

    const directoryId = await ensureDirectoryChain("");

    expect(mock.insertInto("directories").values).toHaveBeenCalledWith({
      path: "",
      parent_id: null,
      ...EMPTY_AGGREGATE,
    });
    expect(directoryId).toBe(1);
  });

  it("creates every missing ancestor with the correct parent linkage", async () => {
    mock
      .insertInto("directories")
      .executeTakeFirstOrThrow.mockResolvedValueOnce({ id: "1" })
      .mockResolvedValueOnce({ id: "2" })
      .mockResolvedValueOnce({ id: "3" });

    await ensureDirectoryChain("tiles/forest");

    expect(mock.insertInto("directories").values).toHaveBeenNthCalledWith(1, {
      path: "",
      parent_id: null,
      ...EMPTY_AGGREGATE,
    });
    expect(mock.insertInto("directories").values).toHaveBeenNthCalledWith(2, {
      path: "tiles",
      parent_id: 1,
      ...EMPTY_AGGREGATE,
    });
    expect(mock.insertInto("directories").values).toHaveBeenNthCalledWith(THIRD_CALL, {
      path: "tiles/forest",
      parent_id: 2,
      ...EMPTY_AGGREGATE,
    });
  });

  it("returns the id of the resolved directory", async () => {
    mock
      .insertInto("directories")
      .executeTakeFirstOrThrow.mockResolvedValueOnce({ id: "1" })
      .mockResolvedValueOnce({ id: "2" })
      .mockResolvedValueOnce({ id: "3" });

    const directoryId = await ensureDirectoryChain("tiles/forest");

    expect(directoryId).toBe(FOREST_DIRECTORY_ID);
  });

  it("does not duplicate rows when called twice for the same path", async () => {
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "1" })
      .mockResolvedValueOnce({ id: "2" })
      .mockResolvedValueOnce({ id: "3" });
    mock
      .insertInto("directories")
      .executeTakeFirstOrThrow.mockResolvedValueOnce({ id: "1" })
      .mockResolvedValueOnce({ id: "2" })
      .mockResolvedValueOnce({ id: "3" });

    await ensureDirectoryChain("tiles/forest");
    await ensureDirectoryChain("tiles/forest");

    expect(mock.insertInto("directories").values).toHaveBeenCalledTimes(EXPECTED_INSERT_CALL_COUNT);
  });

  it("reuses already-existing ancestors instead of recreating them", async () => {
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "1" })
      .mockResolvedValueOnce({ id: "2" });
    mock
      .insertInto("directories")
      .executeTakeFirstOrThrow.mockResolvedValueOnce({ id: "1" })
      .mockResolvedValueOnce({ id: "2" })
      .mockResolvedValueOnce({ id: "3" });

    await ensureDirectoryChain("tiles");
    await ensureDirectoryChain("tiles/forest");

    expect(mock.insertInto("directories").values).toHaveBeenCalledTimes(EXPECTED_INSERT_CALL_COUNT);
    expect(mock.insertInto("directories").values).toHaveBeenNthCalledWith(THIRD_CALL, {
      path: "tiles/forest",
      parent_id: 2,
      ...EMPTY_AGGREGATE,
    });
  });
});
