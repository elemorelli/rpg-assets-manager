import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import type { BatchDiffResult } from "../../diff/index.ts";
import { buildFinishSyncRunUpdate, failSyncRun, finishSyncRun, startSyncRun } from "../sync-run.ts";

const emptyDiff: BatchDiffResult = {
  added: [],
  modified: [],
  deleted: [],
  renamed: [],
  ambiguousWarnings: [],
};

describe("buildFinishSyncRunUpdate", () => {
  it("counts each kind of change from the diff", () => {
    const diff: BatchDiffResult = {
      added: ["a.png", "b.png"],
      modified: ["c.png"],
      deleted: [],
      renamed: [{ oldPath: "old.png", newPath: "new.png" }],
      ambiguousWarnings: [],
    };
    const finishedAt = new Date("2026-08-15T10:00:00Z");

    const update = buildFinishSyncRunUpdate("applied", diff, [], finishedAt);

    expect(update).toMatchObject({
      finished_at: finishedAt,
      added_count: 2,
      modified_count: 1,
      deleted_count: 0,
      renamed_count: 1,
      outcome: "applied",
    });
  });

  it("JSON-encodes purge urls", () => {
    const finishedAt = new Date("2026-08-15T10:00:00Z");

    const update = buildFinishSyncRunUpdate(
      "applied",
      emptyDiff,
      ["https://assets.example.com/a.png"],
      finishedAt,
    );

    expect(update.purged_urls).toBe(JSON.stringify(["https://assets.example.com/a.png"]));
  });

  it("encodes empty purge urls for a dry run", () => {
    const finishedAt = new Date("2026-08-15T10:00:00Z");

    const update = buildFinishSyncRunUpdate("dry_run", emptyDiff, [], finishedAt);

    expect(update.outcome).toBe("dry_run");
    expect(update.purged_urls).toBe("[]");
  });
});

// The update payload's content (counts, JSON encoding) is covered above by
// buildFinishSyncRunUpdate's own tests. These only exercise the wiring: does
// each function write to the right row via the right Kysely call.

describe("startSyncRun", () => {
  it("inserts a new sync_runs row and returns its numeric id", async () => {
    const db = createFakeDb();

    const syncRunId = await startSyncRun(db);

    expect(syncRunId).toBe(1);
    expect(db.rows("sync_runs")).toMatchObject([{ id: "1", finished_at: null }]);
  });
});

describe("finishSyncRun", () => {
  it("updates the sync_runs row for the given id", async () => {
    const db = createFakeDb();
    const syncRunId = await startSyncRun(db);

    await finishSyncRun(db, syncRunId, "applied", emptyDiff, []);

    const [row] = db.rows("sync_runs");

    expect(row).toMatchObject({ id: String(syncRunId), outcome: "applied" });
    expect(row?.finished_at).toBeInstanceOf(Date);
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
