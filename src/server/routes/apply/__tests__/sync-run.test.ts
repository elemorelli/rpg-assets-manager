import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import type { BatchDiffResult } from "../../diff/index.ts";
import { failSyncRun, finishSyncRun, startSyncRun } from "../sync-run.ts";

const emptyDiff: BatchDiffResult = {
  added: [],
  modified: [],
  deleted: [],
  renamed: [],
  ambiguousWarnings: [],
};

describe("startSyncRun", () => {
  it("inserts a new sync_runs row and returns its numeric id", async () => {
    const db = createFakeDb();

    const syncRunId = await startSyncRun(db);

    expect(syncRunId).toBe(1);
    expect(db.rows("sync_runs")).toMatchObject([
      { id: "1", finished_at: null, generated_macro: null },
    ]);
  });
});

describe("finishSyncRun", () => {
  it("records the diff counts and outcome, JSON-encoding purge urls and world acknowledgements", async () => {
    const db = createFakeDb();
    const syncRunId = await startSyncRun(db);

    const diff: BatchDiffResult = {
      added: ["a.png", "b.png"],
      modified: ["c.png"],
      deleted: [],
      renamed: [{ oldPath: "old.png", newPath: "new.png" }],
      ambiguousWarnings: [],
    };

    await finishSyncRun(
      db,
      syncRunId,
      "applied",
      diff,
      ["https://assets.example.com/a.png"],
      "// macro",
      { kingmaker: false },
    );

    const [row] = db.rows("sync_runs");

    expect(row).toMatchObject({
      outcome: "applied",
      added_count: 2,
      modified_count: 1,
      deleted_count: 0,
      renamed_count: 1,
      generated_macro: "// macro",
    });
    expect(row?.finished_at).toBeInstanceOf(Date);
    expect(JSON.parse(row?.purged_urls as string)).toEqual(["https://assets.example.com/a.png"]);
    expect(JSON.parse(row?.world_acknowledgements as string)).toEqual({ kingmaker: false });
  });

  it("records a dry_run outcome with empty purge urls and world acknowledgements", async () => {
    const db = createFakeDb();
    const syncRunId = await startSyncRun(db);

    await finishSyncRun(db, syncRunId, "dry_run", emptyDiff, [], null, {});

    const [row] = db.rows("sync_runs");

    expect(row).toMatchObject({ outcome: "dry_run", generated_macro: null });
    expect(JSON.parse(row?.purged_urls as string)).toEqual([]);
    expect(JSON.parse(row?.world_acknowledgements as string)).toEqual({});
  });
});

describe("failSyncRun", () => {
  it("marks the run as failed and stamps finished_at", async () => {
    const db = createFakeDb();
    const syncRunId = await startSyncRun(db);

    await failSyncRun(db, syncRunId);

    const [row] = db.rows("sync_runs");

    expect(row).toMatchObject({ outcome: "failed" });
    expect(row?.finished_at).toBeInstanceOf(Date);
  });
});
