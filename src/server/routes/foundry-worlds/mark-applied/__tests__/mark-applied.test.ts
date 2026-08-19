import { describe, expect, it } from "vitest";

import { HttpError } from "#server/errors/index.ts";
import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { markFoundryWorldApplied } from "../mark-applied.ts";

const NON_EXISTENT_WORLD_ID = 999999999;
const OLD_WATERMARK = new Date("2020-01-01T00:00:00Z");

describe("markFoundryWorldApplied", () => {
  it("advances the world's watermark to now", async () => {
    const db = createFakeDb();

    db.seed("foundry_worlds", [
      { id: "1", name: "kingmaker", active: true, acknowledged_at: OLD_WATERMARK },
    ]);

    const before = new Date();
    await markFoundryWorldApplied(db, 1);
    const after = new Date();

    const [world] = db.rows("foundry_worlds");
    const acknowledgedAt = world?.acknowledged_at as Date;
    expect(acknowledgedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(acknowledgedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("throws when the world does not exist", async () => {
    const db = createFakeDb();

    await expect(markFoundryWorldApplied(db, NON_EXISTENT_WORLD_ID)).rejects.toThrow(HttpError);
  });
});
