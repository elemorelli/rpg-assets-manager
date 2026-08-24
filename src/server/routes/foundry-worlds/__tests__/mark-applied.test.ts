import type { Kysely } from "kysely";
import { describe, expect, it, vi } from "vitest";

import type { DB } from "#server/db/index.ts";
import { HttpError } from "#server/errors/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

const NON_EXISTENT_WORLD_ID = 999999999;

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { markFoundryWorldApplied } = await import("../mark-applied.ts");

const createMock = (): MockDb => {
  const mockDb = createMockDb();

  currentMockDb = mockDb;

  return mockDb as unknown as MockDb;
};

describe("markFoundryWorldApplied", () => {
  it("advances the world's watermark to now", async () => {
    const mock = createMock();

    mock.selectFrom("foundry_worlds").executeTakeFirst.mockResolvedValueOnce({ id: "1" });

    const before = new Date();
    await markFoundryWorldApplied(1);
    const after = new Date();

    expect(mock.updateTable).toHaveBeenCalledWith("foundry_worlds");

    const [values] = mock.updateTable("foundry_worlds").set.mock.calls[0] as [
      { acknowledged_at: Date },
    ];

    expect(values.acknowledged_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(values.acknowledged_at.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("throws when the world does not exist", async () => {
    createMock();

    await expect(markFoundryWorldApplied(NON_EXISTENT_WORLD_ID)).rejects.toThrow(HttpError);
  });
});
