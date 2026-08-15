import { afterAll, afterEach, describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";

import { finishSyncRun, startSyncRun } from "../../../apply/sync-run.ts";
import { listSyncRuns } from "../list-sync-runs.ts";

const emptyDiff = { added: [], modified: [], deleted: [], renamed: [], ambiguousWarnings: [] };

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

describe("listSyncRuns", () => {
  it("returns runs newest first, with counts and macro state", async () => {
    const firstId = await startSyncRun(db);
    createdIds.push(firstId);
    await finishSyncRun(db, firstId, "dry_run", emptyDiff, [], null, {});

    const secondId = await startSyncRun(db);
    createdIds.push(secondId);
    await finishSyncRun(
      db,
      secondId,
      "applied",
      { added: ["a.png"], modified: [], deleted: [], renamed: [], ambiguousWarnings: [] },
      ["https://assets.example.com/a.png"],
      "// generated macro",
      { kingmaker: false },
    );

    const runs = await listSyncRuns(db);
    const secondIndex = runs.findIndex((run) => run.id === secondId);
    const firstIndex = runs.findIndex((run) => run.id === firstId);

    expect(secondIndex).toBeGreaterThanOrEqual(0);
    expect(firstIndex).toBeGreaterThan(secondIndex);
    expect(runs[secondIndex]).toMatchObject({
      outcome: "applied",
      addedCount: 1,
      generatedMacro: "// generated macro",
      worldAcknowledgements: { kingmaker: false },
    });
    expect(runs[firstIndex]).toMatchObject({
      outcome: "dry_run",
      generatedMacro: null,
      worldAcknowledgements: {},
    });
  });
});
