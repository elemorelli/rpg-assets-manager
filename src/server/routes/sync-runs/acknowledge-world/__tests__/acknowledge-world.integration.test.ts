import { afterAll, afterEach, describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";
import { HttpError } from "#server/errors/index.ts";

import { finishSyncRun, startSyncRun } from "../../../apply/sync-run.ts";
import { acknowledgeWorld } from "../acknowledge.ts";

const emptyDiff = { added: [], modified: [], deleted: [], renamed: [], ambiguousWarnings: [] };
const NON_EXISTENT_SYNC_RUN_ID = 999999999;

let createdIds: number[] = [];

afterEach(async () => {
  for (const id of createdIds) {
    await db.deleteFrom("sync_runs").where("id", "=", String(id)).execute();
  }
  createdIds = [];
});

afterAll(async () => {
  await db.destroy();
});

describe("acknowledgeWorld", () => {
  it("flips one world's flag without touching the others", async () => {
    const syncRunId = await startSyncRun(db);
    createdIds.push(syncRunId);
    await finishSyncRun(db, syncRunId, "applied", emptyDiff, [], "// macro", {
      kingmaker: false,
      "stolen-fate": false,
    });

    await acknowledgeWorld(db, syncRunId, "kingmaker", true);

    const row = await db
      .selectFrom("sync_runs")
      .select("world_acknowledgements")
      .where("id", "=", String(syncRunId))
      .executeTakeFirstOrThrow();

    expect(row.world_acknowledgements).toEqual({ kingmaker: true, "stolen-fate": false });
  });

  it("throws when the sync run does not exist", async () => {
    await expect(acknowledgeWorld(db, NON_EXISTENT_SYNC_RUN_ID, "kingmaker", true)).rejects.toThrow(
      HttpError,
    );
  });
});
