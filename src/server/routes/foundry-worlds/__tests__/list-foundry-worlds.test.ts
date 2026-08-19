import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { listFoundryWorlds } from "../list-foundry-worlds.ts";

const BASE_URL = "https://assets.example.com";
const EARLIER = new Date("2026-01-01T00:00:00Z");
const LATER = new Date("2026-01-02T00:00:00Z");

describe("listFoundryWorlds", () => {
  it("returns no pending macro for a world with nothing new since its watermark", async () => {
    const db = createFakeDb();

    db.seed("foundry_worlds", [
      { id: "1", name: "kingmaker", active: true, acknowledged_at: LATER },
    ]);
    db.seed("asset_renames", [
      { id: "1", old_path: "tiles/old.png", new_path: "tiles/new.png", renamed_at: EARLIER },
    ]);

    const [world] = await listFoundryWorlds(db, BASE_URL);

    expect(world).toMatchObject({
      id: 1,
      name: "kingmaker",
      pendingMacro: null,
      pendingRenameCount: 0,
    });
  });

  it("builds a macro for renames past the world's watermark", async () => {
    const db = createFakeDb();

    db.seed("foundry_worlds", [
      { id: "1", name: "kingmaker", active: true, acknowledged_at: EARLIER },
    ]);
    db.seed("asset_renames", [
      { id: "1", old_path: "tiles/old.png", new_path: "tiles/new.png", renamed_at: LATER },
    ]);

    const [world] = await listFoundryWorlds(db, BASE_URL);

    expect(world.pendingRenameCount).toBe(1);
    expect(world.pendingMacro).toContain(
      `["${BASE_URL}/tiles/old.png", "${BASE_URL}/tiles/new.png"]`,
    );
  });

  it("collapses a chain of renames into one net rename", async () => {
    const db = createFakeDb();

    db.seed("foundry_worlds", [
      { id: "1", name: "kingmaker", active: true, acknowledged_at: EARLIER },
    ]);
    db.seed("asset_renames", [
      { id: "1", old_path: "a.png", new_path: "b.png", renamed_at: LATER },
      { id: "2", old_path: "b.png", new_path: "c.png", renamed_at: LATER },
    ]);

    const [world] = await listFoundryWorlds(db, BASE_URL);

    expect(world.pendingRenameCount).toBe(1);
    expect(world.pendingMacro).toContain(`["${BASE_URL}/a.png", "${BASE_URL}/c.png"]`);
  });

  it("ignores inactive worlds", async () => {
    const db = createFakeDb();

    db.seed("foundry_worlds", [
      { id: "1", name: "retired-campaign", active: false, acknowledged_at: EARLIER },
    ]);

    expect(await listFoundryWorlds(db, BASE_URL)).toEqual([]);
  });

  it("tracks each world's own watermark independently", async () => {
    const db = createFakeDb();

    db.seed("foundry_worlds", [
      { id: "1", name: "kingmaker", active: true, acknowledged_at: EARLIER },
      { id: "2", name: "stolen-fate", active: true, acknowledged_at: LATER },
    ]);
    db.seed("asset_renames", [
      { id: "1", old_path: "tiles/old.png", new_path: "tiles/new.png", renamed_at: LATER },
    ]);

    const worlds = await listFoundryWorlds(db, BASE_URL);

    expect(worlds.find((world) => world.name === "kingmaker")?.pendingRenameCount).toBe(1);
    expect(worlds.find((world) => world.name === "stolen-fate")?.pendingRenameCount).toBe(0);
  });
});
