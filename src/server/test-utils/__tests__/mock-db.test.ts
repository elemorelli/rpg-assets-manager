import { describe, expect, it } from "vitest";

import { createMockDb, type MockDb } from "../mock-db.ts";

describe("createMockDb", () => {
  it("gives each table its own queue of resolved values for a chain method", async () => {
    const mockDb = createMockDb();
    const mock = mockDb as unknown as MockDb;

    mock
      .selectFrom("directories")
      .executeTakeFirst.mockResolvedValueOnce({ id: "2", total_size: 14 })
      .mockResolvedValueOnce({ id: "1", total_size: 14 });

    const first = await mockDb
      .selectFrom("directories")
      .select(["id", "total_size"])
      .where("path", "=", "a")
      .executeTakeFirst();
    const second = await mockDb
      .selectFrom("directories")
      .select(["id", "total_size"])
      .where("path", "=", "")
      .executeTakeFirst();

    expect(first).toEqual({ id: "2", total_size: 14 });
    expect(second).toEqual({ id: "1", total_size: 14 });
  });

  it("keeps different tables and root methods independently assertable", async () => {
    const mockDb = createMockDb();
    const mock = mockDb as unknown as MockDb;

    await mockDb.deleteFrom("assets").where("path", "=", "a").execute();
    await mockDb.deleteFrom("directories").where("path", "=", "a").execute();

    expect(mock.deleteFrom).toHaveBeenNthCalledWith(1, "assets");
    expect(mock.deleteFrom).toHaveBeenNthCalledWith(2, "directories");
    expect(mock.deleteFrom("assets").execute).toHaveBeenCalledTimes(1);
    expect(mock.deleteFrom("directories").execute).toHaveBeenCalledTimes(1);
  });

  it("routes transaction(cb) through the same mock db", async () => {
    const mockDb = createMockDb();
    const mock = mockDb as unknown as MockDb;

    await mockDb.transaction().execute(async (trx) => {
      await trx
        .insertInto("assets")
        .values({ path: "a", hash: "h", size: 1, mtime: new Date() })
        .execute();
    });

    expect(mock.insertInto).toHaveBeenCalledWith("assets");
  });
});
