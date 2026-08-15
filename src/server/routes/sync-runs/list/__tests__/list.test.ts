import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { listSyncRuns } from "../list-sync-runs.ts";

describe("listSyncRuns", () => {
  it("returns runs newest first, mapping db columns to camelCase fields", async () => {
    const db = createFakeDb();

    db.seed("sync_runs", [
      {
        id: "1",
        started_at: new Date("2026-01-01T00:00:00Z"),
        finished_at: new Date("2026-01-01T00:01:00Z"),
        added_count: 0,
        modified_count: 0,
        deleted_count: 0,
        renamed_count: 0,
        outcome: "dry_run",
        generated_macro: null,
        world_acknowledgements: {},
      },
      {
        id: "2",
        started_at: new Date("2026-01-02T00:00:00Z"),
        finished_at: new Date("2026-01-02T00:01:00Z"),
        added_count: 1,
        modified_count: 0,
        deleted_count: 0,
        renamed_count: 0,
        outcome: "applied",
        generated_macro: "// generated macro",
        world_acknowledgements: { kingmaker: false },
      },
    ]);

    const runs = await listSyncRuns(db);

    expect(runs.map((run) => run.id)).toEqual([2, 1]);
    expect(runs[0]).toMatchObject({
      outcome: "applied",
      addedCount: 1,
      generatedMacro: "// generated macro",
      worldAcknowledgements: { kingmaker: false },
    });
    expect(runs[1]).toMatchObject({
      outcome: "dry_run",
      generatedMacro: null,
      worldAcknowledgements: {},
    });
  });

  it("returns an empty list when there are no sync runs", async () => {
    const db = createFakeDb();

    expect(await listSyncRuns(db)).toEqual([]);
  });
});
