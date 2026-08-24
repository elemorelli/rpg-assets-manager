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

const { applyAggregateDelta } = await import("../apply-aggregate-delta.ts");

const FIRST_CALL = 1;
const SECOND_CALL = 2;
const THIRD_CALL = 3;
const FOURTH_CALL = 4;

describe("applyAggregateDelta", () => {
  let mock: MockDb;

  beforeEach(() => {
    const mockDb = createMockDb();

    currentMockDb = mockDb;
    mock = mockDb as unknown as MockDb;
  });

  it("applies the delta to the start path and every ancestor up to root", async () => {
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce({
        id: "3",
        total_size: 0,
        file_count: 0,
        folder_count: 0,
      })
      .mockResolvedValueOnce({ id: "2", total_size: 0, file_count: 0, folder_count: 0 })
      .mockResolvedValueOnce({ id: "1", total_size: 0, file_count: 0, folder_count: 0 });

    await applyAggregateDelta("tiles/forest", { size: 100, fileCount: 1, folderCount: 0 });

    const expectedSet = { total_size: 100, file_count: 1, folder_count: 0 };

    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(FIRST_CALL, expectedSet);
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(SECOND_CALL, expectedSet);
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(THIRD_CALL, expectedSet);
  });

  it("accumulates across multiple calls", async () => {
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce({
        id: "2",
        total_size: 0,
        file_count: 0,
        folder_count: 0,
      })
      .mockResolvedValueOnce({ id: "1", total_size: 0, file_count: 0, folder_count: 0 })
      .mockResolvedValueOnce({ id: "2", total_size: 100, file_count: 1, folder_count: 0 })
      .mockResolvedValueOnce({ id: "1", total_size: 100, file_count: 1, folder_count: 0 });

    await applyAggregateDelta("tiles", { size: 100, fileCount: 1, folderCount: 0 });
    await applyAggregateDelta("tiles", { size: 50, fileCount: 1, folderCount: 0 });

    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(THIRD_CALL, {
      total_size: 150,
      file_count: 2,
      folder_count: 0,
    });
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(FOURTH_CALL, {
      total_size: 150,
      file_count: 2,
      folder_count: 0,
    });
  });

  it("supports negative deltas, e.g. when removing content", async () => {
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce({
        id: "2",
        total_size: 0,
        file_count: 0,
        folder_count: 0,
      })
      .mockResolvedValueOnce({ id: "1", total_size: 0, file_count: 0, folder_count: 0 })
      .mockResolvedValueOnce({ id: "2", total_size: 100, file_count: 2, folder_count: 0 })
      .mockResolvedValueOnce({ id: "1", total_size: 100, file_count: 2, folder_count: 0 });

    await applyAggregateDelta("tiles", { size: 100, fileCount: 2, folderCount: 0 });
    await applyAggregateDelta("tiles", { size: -40, fileCount: -1, folderCount: 0 });

    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(THIRD_CALL, {
      total_size: 60,
      file_count: 1,
      folder_count: 0,
    });
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(FOURTH_CALL, {
      total_size: 60,
      file_count: 1,
      folder_count: 0,
    });
  });

  it("increments folder_count on every target path, start path included", async () => {
    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce({
        id: "2",
        total_size: 0,
        file_count: 0,
        folder_count: 0,
      })
      .mockResolvedValueOnce({ id: "1", total_size: 0, file_count: 0, folder_count: 0 });

    await applyAggregateDelta("tiles", { size: 0, fileCount: 0, folderCount: 1 });

    const expectedSet = { total_size: 0, file_count: 0, folder_count: 1 };

    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(1, expectedSet);
    expect(mock.updateTable("directories").set).toHaveBeenNthCalledWith(2, expectedSet);
  });
});
