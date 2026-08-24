import type { Kysely } from "kysely";
import { describe, expect, it, vi } from "vitest";

import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

const BASE_URL = "https://assets.example.com";
const EARLIER = new Date("2026-01-01T00:00:00Z");
const LATER = new Date("2026-01-02T00:00:00Z");

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { listFoundryWorlds } = await import("../list.ts");

const createMock = (): MockDb => {
  const mockDb = createMockDb();

  currentMockDb = mockDb;

  return mockDb as unknown as MockDb;
};

describe("listFoundryWorlds", () => {
  it("returns no pending macro for a world with nothing new since its watermark", async () => {
    const mock = createMock();

    mock
      .selectFrom("foundry_worlds")
      .execute.mockResolvedValueOnce([{ id: "1", name: "kingmaker", acknowledged_at: LATER }]);
    mock.selectFrom("asset_renames").execute.mockResolvedValueOnce([]);

    const [world] = await listFoundryWorlds(BASE_URL);

    expect(world).toMatchObject({
      id: 1,
      name: "kingmaker",
      pendingMacro: null,
      pendingRenameCount: 0,
    });
  });

  it("builds a macro for renames past the world's watermark", async () => {
    const mock = createMock();

    mock
      .selectFrom("foundry_worlds")
      .execute.mockResolvedValueOnce([{ id: "1", name: "kingmaker", acknowledged_at: EARLIER }]);
    mock
      .selectFrom("asset_renames")
      .execute.mockResolvedValueOnce([{ old_path: "tiles/old.png", new_path: "tiles/new.png" }]);

    const [world] = await listFoundryWorlds(BASE_URL);

    expect(world?.pendingRenameCount).toBe(1);
    expect(world?.pendingMacro).toContain(
      `["${BASE_URL}/tiles/old.png", "${BASE_URL}/tiles/new.png"]`,
    );
  });

  it("collapses a chain of renames into one net rename", async () => {
    const mock = createMock();

    mock
      .selectFrom("foundry_worlds")
      .execute.mockResolvedValueOnce([{ id: "1", name: "kingmaker", acknowledged_at: EARLIER }]);
    mock.selectFrom("asset_renames").execute.mockResolvedValueOnce([
      { old_path: "a.png", new_path: "b.png" },
      { old_path: "b.png", new_path: "c.png" },
    ]);

    const [world] = await listFoundryWorlds(BASE_URL);

    expect(world?.pendingRenameCount).toBe(1);
    expect(world?.pendingMacro).toContain(`["${BASE_URL}/a.png", "${BASE_URL}/c.png"]`);
  });

  it("ignores inactive worlds", async () => {
    const mock = createMock();

    mock.selectFrom("foundry_worlds").execute.mockResolvedValueOnce([]);

    expect(await listFoundryWorlds(BASE_URL)).toEqual([]);
  });

  it("tracks each world's own watermark independently", async () => {
    const mock = createMock();

    mock.selectFrom("foundry_worlds").execute.mockResolvedValueOnce([
      { id: "1", name: "kingmaker", acknowledged_at: EARLIER },
      { id: "2", name: "stolen-fate", acknowledged_at: LATER },
    ]);
    mock
      .selectFrom("asset_renames")
      .execute.mockResolvedValueOnce([{ old_path: "tiles/old.png", new_path: "tiles/new.png" }])
      .mockResolvedValueOnce([]);

    const worlds = await listFoundryWorlds(BASE_URL);

    expect(worlds.find((world) => world.name === "kingmaker")?.pendingRenameCount).toBe(1);
    expect(worlds.find((world) => world.name === "stolen-fate")?.pendingRenameCount).toBe(0);
  });
});
